from dataclasses import dataclass
from pathlib import Path
import torch
import os


def _env_bool(name: str, default: bool) -> bool:
    val = os.getenv(name)
    if val is None:
        return default
    return val.strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class Settings:
    # Model / inference
    model_path: Path = Path("weights/best_7class.pt")
    image_size: int = 224
    device: str = "cuda" if torch.cuda.is_available() else "cpu"

    # Decisions
    threshold: float = 0.5
    
    # 7-Class HAM10000 Mapping
    class_names: tuple = (
        "Actinic Keratosis (AKIEC)",
        "Basal Cell Carcinoma (BCC)",
        "Benign Keratosis (BKL)",
        "Dermatofibroma (DF)",
        "Melanoma (MEL)",
        "Melanocytic Nevi (NV)",
        "Vascular Lesions (VASC)"
    )

    # Normalization
    mean: tuple | None = None
    std: tuple | None = None

    # Safety
    min_image_side: int = 64

    # --- TELEGRAM MONITORING ---
    TELEGRAM_BOT_TOKEN: str = os.getenv("TELEGRAM_BOT_TOKEN", "")
    TELEGRAM_CHAT_ID: str = os.getenv("TELEGRAM_CHAT_ID", "")
    TELEGRAM_ENABLED: bool = _env_bool("TELEGRAM_ENABLED", True) and bool(TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID)
    TELEGRAM_REPORT_INTERVAL_MINUTES: int = int(os.getenv("TELEGRAM_REPORT_INTERVAL_MINUTES", "30"))
    ENABLE_GPU_MONITORING: bool = _env_bool("ENABLE_GPU_MONITORING", True)


settings = Settings()