from __future__ import annotations
from PIL import Image
import torch
from torchvision import transforms

from core.config import settings


def get_transform(image_size: int | None = None) -> transforms.Compose:
    s = image_size or settings.image_size
    steps = [
        transforms.Resize((s, s)),
        transforms.ToTensor(),
    ]
    # Apply normalization only if defined (train_quick.py skipped it)
    if settings.mean and settings.std:
        steps.append(transforms.Normalize(mean=settings.mean, std=settings.std))
    
    return transforms.Compose(steps)


def preprocess_pil(img: Image.Image, image_size: int | None = None) -> torch.Tensor:
    if img.mode != "RGB":
        img = img.convert("RGB")
    tfm = get_transform(image_size=image_size)
    return tfm(img).unsqueeze(0)