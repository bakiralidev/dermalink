from __future__ import annotations
from dataclasses import dataclass
from pathlib import Path
from typing import Optional, Tuple, List
import pandas as pd
import numpy as np
from PIL import Image

import torch
from sklearn.metrics import (
    confusion_matrix,
    precision_recall_fscore_support,
    roc_auc_score,
    accuracy_score,
)

from core.model import ModelBundle
from core.predict import predict_image
from core.config import settings


@dataclass
class EvalReport:
    threshold: float
    accuracy: float
    precision: float
    recall: float
    f1: float
    roc_auc: Optional[float]
    cm: np.ndarray  # [[tn, fp],[fn,tp]]
    support_benign: int
    support_malignant: int


def _resolve_image_path(image_root: str | Path, image_id: str) -> Path:
    image_root = Path(image_root)
    # Extension testing
    p = image_root / image_id
    if p.exists(): return p

    for ext in [".jpg", ".jpeg", ".png", ".JPG", ".JPEG", ".PNG"]:
        cand = image_root / f"{image_id}{ext}"
        if cand.exists(): return cand

    raise FileNotFoundError(f"Image topilmadi: {image_id} (Papkada: {image_root.resolve()})")


def evaluate_from_csv(
    bundle: ModelBundle,
    csv_path: str | Path,
    image_root: str | Path | None = None,
    threshold: float | None = None,
    max_rows: int | None = None,
) -> Tuple[EvalReport, pd.DataFrame]:
    th = float(threshold if threshold is not None else settings.threshold)
    df = pd.read_csv(csv_path)

    # Normalizing columns
    df.columns = [c.lower() for c in df.columns]
    if "label" not in df.columns:
        raise ValueError("CSV da 'label' ustuni bo'lishi shart.")

    if max_rows:
        df = df.head(int(max_rows)).copy()

    y_true, y_prob, image_paths = [], [], []

    for _, row in df.iterrows():
        yt = int(row["label"])
        
        # Path resolution
        if "image_path" in df.columns:
            p = Path(row["image_path"])
            if not p.is_absolute() and image_root:
                p = Path(image_root) / p
        elif "path" in df.columns:
            p = Path(row["path"])
        else:
            if not image_root: raise ValueError("Image_root kerak (image_id ishlatilganda).")
            p = _resolve_image_path(image_root, str(row["image_id"]))

        img = Image.open(p).convert("RGB")
        pred = predict_image(bundle, img)

        # Binary evaluation compatibility: treat MEL probability as malignant score.
        mel_keys = [k for k in (pred.probabilities or {}).keys() if "MEL" in k or "Melanoma" in k]
        if mel_keys:
            malignant_prob = float((pred.probabilities or {}).get(mel_keys[0], 0.0))
        else:
            malignant_prob = float(pred.confidence if "MEL" in pred.label or "Melanoma" in pred.label else 1.0 - pred.confidence)

        y_true.append(yt)
        y_prob.append(malignant_prob)
        image_paths.append(str(p))

    y_true_arr = np.array(y_true)
    y_prob_arr = np.array(y_prob)
    y_pred_arr = (y_prob_arr >= th).astype(int)

    acc = accuracy_score(y_true_arr, y_pred_arr)
    prec, rec, f1, _ = precision_recall_fscore_support(
        y_true_arr, y_pred_arr, average="binary", pos_label=1, zero_division=0
    )
    
    cm = confusion_matrix(y_true_arr, y_pred_arr, labels=[0, 1])
    roc_auc = roc_auc_score(y_true_arr, y_prob_arr) if len(np.unique(y_true_arr)) == 2 else None

    report = EvalReport(
        threshold=th, accuracy=acc, precision=prec, recall=rec, f1=f1, roc_auc=roc_auc,
        cm=cm, support_benign=int((y_true_arr == 0).sum()), support_malignant=int((y_true_arr == 1).sum())
    )

    sample_df = pd.DataFrame({
        "image_path": image_paths, "y_true": y_true_arr,
        "y_prob_malignant": y_prob_arr, "y_pred": y_pred_arr,
    })

    return report, sample_df


def find_best_threshold_for_f1(
    bundle: ModelBundle,
    csv_path: str | Path,
    image_root: str | Path | None = None,
    max_rows: int | None = None,
) -> Tuple[float, pd.DataFrame]:
    thresholds = [i / 100 for i in range(5, 96, 5)]
    results = []
    best_th, best_f1 = 0.5, -1.0

    for th in thresholds:
        rep, _ = evaluate_from_csv(bundle, csv_path, image_root, th, max_rows)
        results.append({
            "threshold": th, "accuracy": rep.accuracy, "precision": rep.precision, 
            "recall": rep.recall, "f1": rep.f1, "roc_auc": rep.roc_auc,
            "tn": rep.cm[0,0], "fp": rep.cm[0,1], "fn": rep.cm[1,0], "tp": rep.cm[1,1]
        })
        if rep.f1 > best_f1:
            best_f1 = rep.f1
            best_th = th

    return best_th, pd.DataFrame(results)