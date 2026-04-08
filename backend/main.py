from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os
import sys
import hashlib

from pydantic import BaseModel

# Add parent directory to path to reach existing core logic
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from core.model import load_model, ModelBundle
from core.config import settings
from core.predict import predict_image
from core.recommendations import build_recommendation

app = FastAPI(title="Skin AI Mastery API", version="1.0.0")

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, replace with specific domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global cache for the model
BUNDLE_CACHE = {}


class PatientRegisterRequest(BaseModel):
    phone: str
    password: str
    confirm_password: str


class PatientLoginRequest(BaseModel):
    phone: str
    password: str


class PatientChangePasswordRequest(BaseModel):
    phone: str
    old_password: str
    new_password: str
    confirm_password: str


def _make_lesion_id(full_name: str, father_name: str, age: int, sex: str, body_part: str) -> str:
    key = "|".join(
        [
            (full_name or "").strip().lower(),
            (father_name or "").strip().lower(),
            str(int(age)),
            (sex or "").strip().lower(),
            (body_part or "").strip().lower(),
        ]
    )
    return hashlib.sha256(key.encode("utf-8")).hexdigest()[:24]

def get_bundle(model_variant: str = "default"):
    # Use absolute path to avoid issues with CWD
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    default_paths = [
        os.path.join(base_dir, "weights", "best_7class_multimodal.pt"),
        os.path.join(base_dir, "weights", "best_7class.pt"),
        os.path.join(base_dir, "weights", "best.pt"),
    ]

    if model_variant == "new_skin":
        paths = [
            os.path.join(base_dir, "weights", "best_new_skin.pt"),
            *default_paths,
        ]
    elif model_variant == "eczema":
        paths = [
            os.path.join(base_dir, "weights", "best_eczema.pt"),
            *default_paths,
        ]
    else:
        paths = default_paths
    
    for p in paths:
        if os.path.exists(p):
            if p not in BUNDLE_CACHE:
                try:
                    BUNDLE_CACHE[p] = load_model(p, settings.device)
                except Exception as e:
                    print(f"Error loading {p}: {e}")
                    continue
            return BUNDLE_CACHE[p]
            
    raise FileNotFoundError(f"Model topilmadi: {paths[0]} (weights/ papkasini tekshiring)")

@app.get("/")
async def health_check():
    return {"status": "online", "message": "Skin AI Mastery API is running"}

@app.get("/api/config")
async def get_config():
    return {
        "class_names": settings.class_names,
        "image_size": settings.image_size,
        "available_models": ["default", "new_skin", "eczema"],
    }


def _response_payload(result, comparison, model_variant: str):
    rec = build_recommendation(result.label, float(result.confidence))
    return {
        "model_variant": model_variant,
        "label": result.label,
        "confidence": float(result.confidence),
        "top_3": result.top_3,
        "warning": result.warning,
        "comparison": comparison,
        "area_mm2": result.segmentation.area_mm2 if result.segmentation else None,
        "recommendation": rec,
    }

@app.get("/api/history/{lesion_id}")
async def get_history(lesion_id: str):
    try:
        from core.database import db
        history = db.get_history(lesion_id)
        return history
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/patient/register")
async def patient_register(payload: PatientRegisterRequest):
    try:
        from core.database import db

        phone = payload.phone.strip().replace(" ", "")
        if len(phone) < 7:
            raise HTTPException(status_code=400, detail="Telefon raqam noto'g'ri.")
        if payload.password != payload.confirm_password:
            raise HTTPException(status_code=400, detail="Parollar mos emas.")
        if len(payload.password) < 6:
            raise HTTPException(status_code=400, detail="Parol kamida 6 ta belgidan iborat bo'lsin.")

        ok, message = db.register_patient(phone, payload.password)
        if not ok:
            raise HTTPException(status_code=400, detail=message)
        return {"ok": True, "message": message, "phone": phone}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/patient/login")
async def patient_login(payload: PatientLoginRequest):
    try:
        from core.database import db

        phone = payload.phone.strip().replace(" ", "")
        if not db.verify_patient(phone, payload.password):
            raise HTTPException(status_code=401, detail="Telefon raqam yoki parol noto'g'ri.")
        return {"ok": True, "phone": phone, "message": "Muvaffaqiyatli kirdingiz."}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/patient/change-password")
async def patient_change_password(payload: PatientChangePasswordRequest):
    try:
        from core.database import db

        if payload.new_password != payload.confirm_password:
            raise HTTPException(status_code=400, detail="Yangi parollar mos emas.")
        if len(payload.new_password) < 6:
            raise HTTPException(status_code=400, detail="Yangi parol kamida 6 ta belgidan iborat bo'lsin.")

        normalized_phone = payload.phone.strip().replace(" ", "")
        ok, message = db.change_patient_password(normalized_phone, payload.old_password, payload.new_password)
        if not ok:
            raise HTTPException(status_code=400, detail=message)
        return {"ok": True, "message": message}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/patient/history/{phone}")
async def patient_history(phone: str):
    try:
        from core.database import db

        clean_phone = phone.strip().replace(" ", "")
        if not db.patient_exists(clean_phone):
            raise HTTPException(status_code=404, detail="Bemor topilmadi.")
        return db.get_patient_cases(clean_phone)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/doctor/dashboard")
async def doctor_dashboard(patient_limit: int = 20, case_limit: int = 30):
    try:
        from core.database import db

        safe_patient_limit = max(1, min(int(patient_limit), 100))
        safe_case_limit = max(1, min(int(case_limit), 200))

        return {
            "patients": db.get_doctor_patients(safe_patient_limit),
            "recent_cases": db.get_doctor_recent_cases(safe_case_limit),
            "stats": db.get_doctor_stats(),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/patient/submit")
async def patient_submit_case(
    file: UploadFile = File(...),
    phone: str = Form(""),
    full_name: str = Form(""),
    father_name: str = Form(""),
    age: int = Form(0),
    sex: str = Form("unknown"),
    body_part: str = Form("unknown"),
    model_variant: str = Form("eczema"),
):
    try:
        from core.database import db
        from PIL import Image
        import io

        clean_phone = phone.strip().replace(" ", "")
        if not clean_phone:
            raise HTTPException(status_code=400, detail="Telefon raqam topilmadi. Qaytadan kiring.")
        if not full_name.strip() or not father_name.strip():
            raise HTTPException(status_code=400, detail="Ism, familiya va otasining ismini kiriting.")
        if age <= 0:
            raise HTTPException(status_code=400, detail="Yosh noto'g'ri.")

        lesion_id = _make_lesion_id(full_name, father_name, age, sex, body_part)

        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")

        chosen_variant = model_variant if model_variant in {"default", "new_skin", "eczema"} else "eczema"
        bundle = get_bundle(chosen_variant)

        from core.predict import predict_with_history
        result, comparison = predict_with_history(bundle, image, lesion_id, meta_dict=None)
        payload = _response_payload(result, comparison, chosen_variant)

        db.add_patient_case(
            phone=clean_phone,
            lesion_id=lesion_id,
            full_name=full_name.strip(),
            father_name=father_name.strip(),
            age=int(age),
            sex=sex.strip(),
            body_part=body_part.strip(),
            model_variant=chosen_variant,
            prediction={label: prob for label, prob in payload["top_3"]},
            recommendation=payload.get("recommendation"),
            comparison=payload.get("comparison"),
            image_path=None,
        )

        return payload
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/predict")
async def predict(
    file: UploadFile = File(...),
    lesion_id: str = "default",
    age: float = 50.0,
    sex: str = "male",
    localization: str = "back"
):
    try:
        # Load image
        from PIL import Image
        import io
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")
        
        # Get Model Bundle (Cached)
        bundle = get_bundle("default")
        
        # Prepare metadata for multimodal
        # Convert strings to float if needed or use as is based on model expectations
        meta_dict = {
            "age": float(age), 
            "sex": sex, 
            "localization": localization
        }
        
        # Predict using existing logic
        from core.predict import predict_with_history
        result, comparison = predict_with_history(bundle, image, lesion_id, meta_dict)
        
        return _response_payload(result, comparison, "default")
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/predict-new-skin")
async def predict_new_skin(
    file: UploadFile = File(...),
    lesion_id: str = "default"
):
    try:
        from PIL import Image
        import io
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")

        bundle = get_bundle("new_skin")

        from core.predict import predict_with_history
        result, comparison = predict_with_history(bundle, image, lesion_id, meta_dict=None)

        return _response_payload(result, comparison, "new_skin")
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/predict-eczema")
async def predict_eczema(
    file: UploadFile = File(...),
    lesion_id: str = "default"
):
    try:
        from PIL import Image
        import io
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")

        bundle = get_bundle("eczema")

        from core.predict import predict_with_history
        result, comparison = predict_with_history(bundle, image, lesion_id, meta_dict=None)

        return _response_payload(result, comparison, "eczema")
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
