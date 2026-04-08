from __future__ import annotations
from dataclasses import dataclass
import numpy as np
import torch
import torch.nn.functional as F
from PIL import Image

from core.preprocess import preprocess_pil
from core.config import settings
from core.model import ModelBundle

@dataclass
class PredictionResult:
    label: str
    confidence: float
    top_3: list[tuple[str, float]]
    num_classes: int
    probabilities: dict[str, float] | None = None
    is_reliable: bool = True
    warning: str | None = None
    segmentation: "SegmentationResult" | None = None  # Reference to segmentation


def _encode_metadata(bundle: ModelBundle, meta_dict: dict | None) -> torch.Tensor | None:
    if not bundle.is_multimodal:
        return None

    meta_dim = bundle.model.meta_mlp[0].in_features
    if not meta_dict:
        return torch.zeros((1, meta_dim), dtype=torch.float32)

    age = float(meta_dict.get("age", 50.0))
    sex = str(meta_dict.get("sex", "unknown")).strip().lower()
    localization = str(meta_dict.get("localization", "unknown")).strip().lower()

    # Use exact checkpoint metadata schema when available.
    if bundle.meta_cols:
        vals = np.zeros((len(bundle.meta_cols),), dtype=np.float32)
        for i, col in enumerate(bundle.meta_cols):
            if col == "age":
                vals[i] = (age - 50.0) / 20.0
            elif col.startswith("sex_"):
                vals[i] = 1.0 if col == f"sex_{sex}" else 0.0
            elif col.startswith("localization_"):
                vals[i] = 1.0 if col == f"localization_{localization}" else 0.0
        return torch.tensor(vals, dtype=torch.float32).unsqueeze(0)

    # Fallback to age + sparse one-hot pattern when checkpoint lacks meta schema.
    vec = np.zeros((meta_dim,), dtype=np.float32)
    vec[0] = (age - 50.0) / 20.0
    if meta_dim > 1 and sex in {"male", "female", "unknown"}:
        sex_idx = {"male": 1, "female": 2, "unknown": 3}.get(sex, 3)
        if sex_idx < meta_dim:
            vec[sex_idx] = 1.0
    return torch.tensor(vec, dtype=torch.float32).unsqueeze(0)

@torch.no_grad()
def predict_image(bundle: ModelBundle | list[ModelBundle], img: Image.Image, meta_tensor: torch.Tensor | None = None) -> PredictionResult:
    """
    Predicts using single model or ensemble of models.
    """
    if isinstance(bundle, ModelBundle):
        bundles = [bundle]
    else:
        bundles = bundle

    all_logits = []
    device = bundles[0].device
    num_classes = bundles[0].num_classes

    # Preprocess: Resize + ToTensor only (normalization applied per-bundle below)
    img_tensor = preprocess_pil(img).to(device)

    for b in bundles:
        # Per-bundle normalization (e.g. ImageNet stats saved in new_skin checkpoint)
        if b.norm_mean and b.norm_std:
            mean = torch.tensor(b.norm_mean, dtype=torch.float32, device=device).view(1, 3, 1, 1)
            std  = torch.tensor(b.norm_std,  dtype=torch.float32, device=device).view(1, 3, 1, 1)
            img_input = (img_tensor - mean) / std
        else:
            img_input = img_tensor

        if b.is_multimodal:
            if meta_tensor is None:
                meta_dim = b.model.meta_mlp[0].in_features
                current_meta_tensor = torch.zeros((1, meta_dim)).to(device)
            else:
                current_meta_tensor = meta_tensor.to(device)
            logits = b.model(img_input, current_meta_tensor)
        else:
            logits = b.model(img_input)

        # Temperature scaling: T > 1.0 flattens probabilities → less overconfident
        T = getattr(b, "temperature", 1.0)
        if T != 1.0:
            logits = logits / T
        all_logits.append(torch.softmax(logits, dim=1))
    
    # Ensemble: Average Probabilities
    avg_probs = torch.stack(all_logits).mean(dim=0).cpu().numpy()[0]
    
    # Get top results
    class_names = bundles[0].class_names if bundles[0].class_names else settings.class_names[:num_classes]
    
    probs_dict = {class_names[i]: float(avg_probs[i]) for i in range(len(class_names))}
    sorted_probs_items = sorted(probs_dict.items(), key=lambda x: x[1], reverse=True)
    
    top_k = 3 if num_classes >= 3 else num_classes
    top_results = sorted_probs_items[:top_k]

    best_label, best_conf = top_results[0]
    
    is_reliable = best_conf >= 0.5
    warning = None
    if not is_reliable:
        warning = "⛔ DIQQAT: AI ushbu rasmga aniq tashxis qo'yishga qiynalmoqda (ishonch 50% dan past). Iltimos, rasm sifatini tekshiring yoki mutaxassisga murojaat qiling."

    return PredictionResult(
        label=best_label,
        confidence=best_conf,
        top_3=top_results,
        num_classes=num_classes,
        probabilities=probs_dict,
        is_reliable=is_reliable,
        warning=warning
    )

def predict_with_history(bundle: ModelBundle | list[ModelBundle], img: Image.Image, lesion_id: str, meta_dict: dict = None, do_segment: bool = True):
    """
    Executes prediction, saves to history, performs segmentation and returns comparison.
    """
    from core.database import db
    from core.comparison import comparator
    from core.segmentation import segmenter
    
    # 1. Convert metadata to tensor for multimodal models.
    if isinstance(bundle, list):
        primary_bundle = bundle[0]
    else:
        primary_bundle = bundle
    meta_tensor = _encode_metadata(primary_bundle, meta_dict)

    # 2. Predict (Ensemble Support)
    result = predict_image(bundle, img, meta_tensor)
    
    # 3. Segmentation (Advanced Phase 6)
    if do_segment:
        seg_res = segmenter.segment(img)
        result.segmentation = seg_res
    
    # 4. Save to DB
    pred_data = {label: prob for label, prob in result.top_3}
    db.add_record(lesion_id, pred_data, metadata=meta_dict)
    
    # 4. Check history for comparison
    history = db.get_history(lesion_id)
    comparison_report = None
    
    if len(history) > 1:
        # Compare newest with the one before it
        comp = comparator.compare_records(history[-2], history[-1])
        comparison_report = comparator.generate_report(comp)
        
    return result, comparison_report