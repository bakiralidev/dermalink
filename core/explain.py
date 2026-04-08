from __future__ import annotations
from dataclasses import dataclass
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from PIL import Image

from core.preprocess import preprocess_pil
from core.config import settings
from core.model import ModelBundle


@dataclass
class GradCAMResult:
    heatmap: np.ndarray  # (H, W) 0..1
    overlay: Image.Image


def _find_target_layer(model: nn.Module, layer_mode: str = "auto") -> nn.Module:
    if layer_mode == "conv_head":
        # For torchvision EfficientNet-B0, model.features[8] is the last conv block
        if hasattr(model, "features") and len(model.features) > 8:
            return model.features[8]
    
    # Auto mode: find last 2D convolution
    last_conv = None
    for m in model.modules():
        if isinstance(m, nn.Conv2d):
            last_conv = m
    if last_conv is None:
        raise RuntimeError("Modelda Conv2d qatlami topilmadi.")
    return last_conv


@torch.inference_mode(False)
def gradcam(
    bundle: ModelBundle,
    img: Image.Image,
    target: str = "malignant",
    alpha: float = 0.5,
    layer_mode: str = "auto",
) -> GradCAMResult:
    """
    Professional Grad-CAM implementation.
    - Uses logits (not softmax) for stable gradients.
    - Supports (B,1) and (B,2) outputs.
    - Upsamples heatmap to original image size.
    """
    model = bundle.model
    model.eval()

    # Preprocess (keeping gradients enabled)
    x = preprocess_pil(img).to(bundle.device)
    x.requires_grad_(True)

    target_layer = _find_target_layer(model, layer_mode)

    feats = []
    grads = []

    def fwd_hook(_, __, output):
        feats.append(output)

    def bwd_hook(_, grad_input, grad_output):
        # Full backward hook returns tuple
        grads.append(grad_output[0])

    h1 = target_layer.register_forward_hook(fwd_hook)
    h2 = target_layer.register_full_backward_hook(bwd_hook)

    if bundle.is_multimodal:
        # Provide dummy meta tensor for Grad-CAM
        meta_dim = model.meta_mlp[0].in_features
        meta = torch.zeros((1, meta_dim)).to(bundle.device)
        logits = model(x, meta)
    else:
        logits = model(x)  # (1, num_classes)
    
    # Target Indexing
    if target in settings.class_names:
        idx = settings.class_names.index(target)
    else:
        # Fallback to class 0 if not found
        idx = 0

    score = logits[0, idx]

    model.zero_grad(set_to_none=True)
    score.backward(retain_graph=True)

    h1.remove()
    h2.remove()

    if not feats or not grads:
        raise RuntimeError("Grad-CAM hooklar ishlamadi. Model strukturasini tekshiring.")

    feature_map = feats[0]           # (1, C, h, w)
    gradient = grads[0]              # (1, C, h, w)

    # Weights via GAP
    weights = gradient.mean(dim=(2, 3), keepdim=True)  # (1, C, 1, 1)
    
    # Weighted combination + ReLU
    cam = (weights * feature_map).sum(dim=1, keepdim=True)  # (1, 1, h, w)
    cam = F.relu(cam)
    
    # Upsample to ORIGINAL image size (professional requirement)
    orig_w, orig_h = img.size
    cam = F.interpolate(cam, size=(orig_h, orig_w), mode="bilinear", align_corners=False)
    cam = cam[0, 0].detach().cpu().numpy()

    # Normalization 0..1
    cam_min, cam_max = cam.min(), cam.max()
    cam = (cam - cam_min) / (cam_max - cam_min + 1e-8)

    # Visualization
    base = img.convert("RGB")
    base_np = np.array(base).astype(np.float32) / 255.0

    # Heatmap to RGB (pure red overlay)
    heat_rgb = np.zeros_like(base_np)
    heat_rgb[..., 0] = cam  # Qizil kanal

    overlay = (1 - alpha) * base_np + alpha * heat_rgb
    overlay = np.clip(overlay * 255.0, 0, 255).astype(np.uint8)

    return GradCAMResult(
        heatmap=cam,
        overlay=Image.fromarray(overlay)
    )