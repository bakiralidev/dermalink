from __future__ import annotations
from dataclasses import dataclass
from pathlib import Path
from typing import Sequence
import torch
import torch.nn as nn
from torchvision.models import efficientnet_b0
import timm


@dataclass
class ModelBundle:
    model: nn.Module
    device: str
    num_classes: int
    is_multimodal: bool = False
    arch: str = "efficientnet"  # "efficientnet" or "vit"
    meta_cols: Sequence[str] | None = None
    class_names: Sequence[str] | None = None
    temperature: float = 1.0
    norm_mean: list | None = None
    norm_std: list | None = None


class FusionModel(nn.Module):
    """
    Phase 2: Fusion Model combining Image Features (CNN) and Metadata (MLP).
    """
    def __init__(self, num_classes: int, meta_dim: int = 24):
        super().__init__()
        # CNN Branch
        self.cnn = efficientnet_b0(weights=None)
        cnn_out_dim = self.cnn.classifier[1].in_features
        self.cnn.classifier = nn.Identity()  # Remove classifier to get features

        # Meta Branch (MLP)
        self.meta_mlp = nn.Sequential(
            nn.Linear(meta_dim, 64),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(64, 32),
            nn.ReLU()
        )

        # Fusion Head
        self.fusion_head = nn.Sequential(
            nn.Linear(cnn_out_dim + 32, 128),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(128, num_classes)
        )

    def forward(self, img, meta):
        cnn_features = self.cnn(img)
        meta_features = self.meta_mlp(meta)
        combined = torch.cat((cnn_features, meta_features), dim=1)
        return self.fusion_head(combined)


def build_model(num_classes: int = 7, is_multimodal: bool = False, meta_dim: int = 24, arch: str = "efficientnet") -> nn.Module:
    if is_multimodal:
        return FusionModel(num_classes=num_classes, meta_dim=meta_dim)
    
    if arch == "vit":
        # Using a small ViT for efficiency
        model = timm.create_model('vit_tiny_patch16_224', pretrained=False, num_classes=num_classes)
        return model

    model = efficientnet_b0(weights=None)
    in_features = model.classifier[1].in_features
    model.classifier[1] = nn.Linear(in_features, num_classes)
    return model


def load_model(model_path: str | Path, device: str, num_classes: int | None = None) -> ModelBundle:
    model_path = Path(model_path)
    if not model_path.exists():
        raise FileNotFoundError(f"Model topilmadi: {model_path}")

    checkpoint = torch.load(model_path, map_location=device)
    state = checkpoint.get("model_state", checkpoint.get("state_dict", checkpoint))
    meta_cols = checkpoint.get("meta_cols") if isinstance(checkpoint, dict) else None
    class_names = checkpoint.get("class_names") if isinstance(checkpoint, dict) else None
    temperature = float(checkpoint.get("temperature", 1.0)) if isinstance(checkpoint, dict) else 1.0
    norm_mean = checkpoint.get("norm_mean") if isinstance(checkpoint, dict) else None
    norm_std = checkpoint.get("norm_std") if isinstance(checkpoint, dict) else None
    
    # Auto-detect modality and meta_dim
    is_multimodal = "meta_mlp.0.weight" in state
    meta_dim = 24 # Default
    if is_multimodal:
        # Extract meta_dim from MLP weights (out_features, in_features)
        meta_dim = state["meta_mlp.0.weight"].shape[1]

    if num_classes is None:
        if is_multimodal:
            num_classes = state["fusion_head.3.weight"].shape[0]
        elif "classifier.1.weight" in state:
            num_classes = state["classifier.1.weight"].shape[0]
        else:
            num_classes = 7

    # Auto-detect architecture
    arch = "vit" if "cls_token" in state or "patch_embed.proj.weight" in state else "efficientnet"

    model = build_model(num_classes=num_classes, is_multimodal=is_multimodal, meta_dim=meta_dim, arch=arch)
    
    cleaned = {k.replace("module.", ""): v for k, v in state.items()}
    model.load_state_dict(cleaned, strict=True)
    model.to(device).eval()
    
    print(f"✅ Model yuklandi: {model_path.name} | Arch: {arch} | Classes: {num_classes} | Multimodal: {is_multimodal}")
    return ModelBundle(
        model=model,
        device=device,
        num_classes=num_classes,
        is_multimodal=is_multimodal,
        arch=arch,
        meta_cols=meta_cols,
        class_names=class_names,
        temperature=temperature,
        norm_mean=list(norm_mean) if norm_mean is not None else None,
        norm_std=list(norm_std) if norm_std is not None else None,
    )