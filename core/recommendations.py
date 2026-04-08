from __future__ import annotations


def build_recommendation(label: str, confidence: float) -> dict:
    name = (label or "").lower()

    urgent_keywords = [
        "malignant",
        "melanoma",
        "carcinoma",
        "vasculitis",
        "lupus",
        "systemic",
    ]
    moderate_keywords = [
        "bacterial",
        "fung",
        "viral",
        "herpes",
        "impetigo",
        "cellulitis",
        "scabies",
        "ringworm",
        "eczema",
        "psoriasis",
        "dermatitis",
    ]

    confidence_pct = confidence * 100

    if any(k in name for k in urgent_keywords):
        level = "high"
        title = "Zudlik bilan shifokorga murojaat qiling"
        advice = (
            "Bu natija jiddiy holat ehtimolini ko'rsatmoqda. "
            "Dermatolog/onkolog ko'rigini kechiktirmang. "
            "AI natijasi yakuniy tashxis emas, lekin tezkor ko'rik tavsiya etiladi."
        )
    elif any(k in name for k in moderate_keywords):
        level = "medium"
        title = "Yaqin kunlarda dermatolog bilan maslahat"
        advice = (
            "Holat infeksion/yallig'lanishli bo'lishi mumkin. "
            "Gigiena va teri parvarishiga e'tibor bering, o'z-o'zini davolashni cheklang. "
            "Agar alomatlar kuchaysa yoki 3-7 kunda yaxshilanmasa, klinik ko'rikka boring."
        )
    else:
        level = "low"
        title = "Profilaktik kuzatuv tavsiya etiladi"
        advice = (
            "Hozircha xavf past ko'rinadi. "
            "Teri holatini kuzatib boring, o'zgarish (rang, o'lcham, og'riq, qonash) bo'lsa shifokorga murojaat qiling."
        )

    if confidence_pct < 55:
        advice += " Natija ishonchliligi pastroq bo'lgani uchun qo'shimcha tekshiruv foydali bo'ladi."

    return {
        "risk_level": level,
        "title": title,
        "text": advice,
        "confidence_pct": round(confidence_pct, 2),
    }
