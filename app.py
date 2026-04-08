from __future__ import annotations
import gradio as gr
import pandas as pd
import numpy as np
import torch
from pathlib import Path
from PIL import Image
from core.config import settings
from core.model import load_model, ModelBundle
from core.predict import predict_with_history, predict_image
from core.explain import gradcam

# Global cache for the model
BUNDLE_CACHE: dict[str, ModelBundle] = {}

def get_bundle() -> ModelBundle:
    # Use the best multimodal model if it exists, otherwise fallback to 7-class or base
    paths = [
        Path("weights/best_7class_multimodal.pt"),
        Path("weights/best_7class.pt"),
        Path("weights/best.pt")
    ]
    
    for p in paths:
        if p.exists():
            p_str = str(p)
            if p_str not in BUNDLE_CACHE:
                BUNDLE_CACHE[p_str] = load_model(p, settings.device)
            return BUNDLE_CACHE[p_str]
    
    raise FileNotFoundError("Hech qanday model fayli topilmadi (weights/ papkasini tekshiring).")

def encode_metadata(age: float, sex: str, localization: str, bundle: ModelBundle):
    """
    Encodes raw metadata into the one-hot format expected by the FusionModel.
    Uses meta_cols stored in the checkpoint for consistency.
    """
    # Load meta_cols from checkpoint if it's a multimodal bundle
    ckpt_path = Path("weights/best_7class_multimodal.pt")
    if not ckpt_path.exists():
        return None
        
    ckpt = torch.load(ckpt_path, map_location="cpu")
    meta_cols = ckpt.get("meta_cols", [])
    
    if not meta_cols:
        return None

    # Create a zeroed series with the right columns
    input_df = pd.DataFrame(columns=meta_cols)
    input_df.loc[0] = 0
    
    # Set Age
    if "age" in input_df.columns:
        # Simple scaling placeholder - in real app use the same scaler from training
        input_df.at[0, "age"] = (age - 50) / 20 # Mean approx 50, std 20
    
    # Sex One-Hot
    sex_col = f"sex_{sex.lower()}"
    if sex_col in input_df.columns:
        input_df.at[0, sex_col] = 1
        
    # Localization One-Hot
    loc_col = f"localization_{localization.lower()}"
    if loc_col in input_df.columns:
        input_df.at[0, loc_col] = 1
        
    return torch.tensor(input_df.values.astype(np.float32))

def get_disease_info(label):
    from core.encyclopedia import DISEASE_INFO
    # Try to match the label
    for key, info in DISEASE_INFO.items():
        if key.startswith(label) or label in key:
            return info
    return None
def get_dataset_samples(limit=15, filter_class=None):
    """Samples random images from HAM10000 for the explorer."""
    try:
        csv_path = Path("data/HAM10000_metadata.csv")
        if not csv_path.exists(): return [], "CSV topilmadi."
        
        df = pd.read_csv(csv_path)
        if filter_class:
            df = df[df["dx"] == filter_class]
        
        limit = int(limit)
        samples = df.sample(min(limit, len(df)))
        
        results = []
        img_dirs = [Path("data/HAM10000_images_part_1"), Path("data/HAM10000_images_part_2")]
        
        for _, row in samples.iterrows():
            img_id = row["image_id"]
            found_path = None
            for d in img_dirs:
                p = d / f"{img_id}.jpg"
                if p.exists():
                    found_path = str(p)
                    break
            if found_path:
                results.append((found_path, f"{row['dx']} | {row['age']}y | {row['sex']}"))
                
        return results, f"✅ {len(results)} ta rasm yuklandi."
    except Exception as e:
        return [], f"❌ Xatolik: {e}"

def app_run_diagnosis(img, lesion_id, age, sex, localization):
    if img is None: 
        return None, None, None, "⚠️ Rasm yuklang", None, None, None, None
    
    try:
        bundle = get_bundle()
    except Exception as e:
        return None, None, None, f"❌ Model hatosi: {e}", None, None, None, None

    # 1. Prepare Metadata
    meta_tensor = encode_metadata(age, sex, localization, bundle) if bundle.is_multimodal else None
    
    # 2. Predict with history
    meta_dict = {"age": age, "sex": sex, "localization": localization} if bundle.is_multimodal else None
    res, comp_report = predict_with_history(bundle, img, lesion_id, meta_dict)
    
    # 3. Get Encyclopedia Info
    info = get_disease_info(res.label)
    info_html = ""
    
    if res.warning:
        info_html += (
            f"<div style='background-color: #782a2a; color: white; padding: 12px; border-radius: 6px; margin-bottom: 10px; border: 1px solid #ff4b4b;'>"
            f"<b>{res.warning}</b></div>"
        )
        
    if info:
        info_html += (
            f"<div style='background-color: #2c3e50; padding: 10px; border-radius: 5px; margin-top: 10px;'>"
            f"📖 <b>Ma'lumotnoma:</b> {info['desc']}<br><br>"
            f"🔍 <b>Belgilari:</b> {info['signs']}<br><br>"
            f"💡 <b>Maslahat:</b> {info['advice']}</div>"
        )

    # Format Top-3 results as a table
    top_html = "<table style='width:100%; border-collapse: collapse;'>"
    top_html += "<tr><th style='border-bottom: 1px solid #ddd; text-align: left;'>Kategoriya</th><th style='border-bottom: 1px solid #ddd; text-align: right;'>Ehtimollik</th></tr>"
    for name, prob in res.top_3:
        top_html += f"<tr><td style='padding: 5px 0;'>{name}</td><td style='padding: 5px 0; text-align: right;'>{prob:.2%}</td></tr>"
    top_html += "</table>"

    # 4. Format Segmentation Info
    area_info = ""
    seg_img = None
    if res.segmentation:
        area_info = f"📏 **O'lcham:** {res.segmentation.area_mm2:.2f} mm² ({res.segmentation.area_pixels} px)"
        seg_img = res.segmentation.overlay

    status_info = f"Model: {res.num_classes} cl | Multimodal: {bundle.is_multimodal} | ID: {lesion_id}"

    # Probabilities dict for gr.Label
    prob_dict = {name: prob for name, prob in res.top_3}

    return (
        prob_dict,
        top_html,
        comp_report if comp_report else "ℹ️ Ushbu ID uchun avvalgi ma'lumotlar mavjud emas.",
        status_info,
        # Store data for PDF
        {
            "lesion_id": lesion_id, "age": age, "sex": sex, "localization": localization,
            "diagnosis": res.label, "confidence": res.confidence, "top_3": res.top_3, "img": img,
            "warning": res.warning, "area_mm2": res.segmentation.area_mm2 if res.segmentation else None
        },
        info_html,
        seg_img,
        area_info
    )

def app_video_predict(img):
    if img is None: return None, "Video yo'q"
    bundle = get_bundle()
    # Perform fast prediction for video
    res = predict_image(bundle, img)
    status = f"🎥 {res.label} ({res.confidence:.1%})"
    return img, status

def app_generate_pdf(pdf_data):
    if not pdf_data: return None, "Avval tahlil o'tkazing!"
    from core.report import pdf_gen
    import tempfile
    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
        pdf_data["img"].save(tmp.name)
        img_path = tmp.name
    pdf_path = pdf_gen.generate(pdf_data, img_path)
    return pdf_path, f"📄 Hisobot tayyorlandi: {Path(pdf_path).name}"

def app_gradcam(img, target, alpha):
    if img is None: return None, "Rasm yuklang"
    bundle = get_bundle()
    res = gradcam(bundle, img, target=target, alpha=alpha, layer_mode="auto")
    return res.overlay, f"Heatmap tayyor! ({bundle.num_classes} klassda tahlil qilindi)"

css = """
.gradio-container { max-width: 1200px !important; margin: auto; }
.header { text-align: center; color: #ff4b4b; margin-bottom: 20px; }
.predict-box { background-color: #1a1a1a; padding: 20px; border-radius: 10px; border: 1px solid #333; }
.timeline-box { background-color: #0d1117; padding: 15px; border-left: 4px solid #58a6ff; margin-top: 15px; }
.info-box { font-size: 0.9em; line-height: 1.4; color: #ecf0f1; }
"""

with gr.Blocks(title="Skin AI Mastery Pro+", css=css) as demo:
    gr.Markdown("# 🏥 Skin AI Mastery (Professional Dashboard)", elem_classes="header")
    
    last_analysis = gr.State()

    with gr.Tabs():
        with gr.Tab("🔬 Diagnostic & Timeline"):
            with gr.Row():
                with gr.Column(scale=1):
                    in_img = gr.Image(type="pil", label="Teri tasvirini yuklang")
                    with gr.Accordion("Bemor Ma'lumotlari (Metadata)", open=True):
                        lesion_id = gr.Textbox(label="Lesion ID (#id)", value="default")
                        age = gr.Number(label="Yosh (Age)", value=50)
                        sex = gr.Dropdown(["male", "female", "unknown"], value="male", label="Jins (Sex)")
                        loc = gr.Dropdown([
                            "abdomen", "acral", "back", "chest", "ear", "face", "foot", 
                            "genital", "hand", "lower extremity", "neck", "scalp", 
                            "trunk", "unknown", "upper extremity"
                        ], value="back", label="Lokalizatsiya")
                    btn_p = gr.Button("🔍 Tahlil qilish (Analyze)", variant="primary")
                
                with gr.Column(scale=1):
                    gr.Markdown("### 📊 Tashxis Natijasi", elem_classes="predict-box")
                    out_label = gr.Label(label="Asosiy Tashxis")
                    out_top = gr.HTML("Kategoriyalar jadvali")
                    
                    with gr.Accordion("📏 Segmentatsiya va O'lcham", open=True):
                        out_seg = gr.Image(label="Segmentation Overlay")
                        out_area = gr.Markdown("O'lcham ma'lumotlari bu yerda chiqadi.")
                    
                    out_info = gr.HTML(label="Tibbiy Ma'lumotnoma", elem_classes="info-box")
                    
                    gr.Markdown("### 🕒 Dinamik Kuzatuv (Timeline)", elem_classes="timeline-box")
                    out_timeline = gr.Markdown("Solishtirish natijasi")
                    
                    out_status = gr.Markdown("*Model: --*")
                    btn_pdf = gr.Button("📄 Professional PDF Hisobotini Yuklab Olish", variant="secondary")
                    out_pdf_file = gr.File(label="Tayyor PDF Hisoboti")
                    out_pdf_status = gr.Markdown("")
            
            btn_p.click(
                app_run_diagnosis, 
                [in_img, lesion_id, age, sex, loc], 
                [out_label, out_top, out_timeline, out_status, last_analysis, out_info, out_seg, out_area]
            )
            btn_pdf.click(app_generate_pdf, [last_analysis], [out_pdf_file, out_pdf_status])

        with gr.Tab("🔥 Explainable AI (Grad-CAM)"):
            with gr.Row():
                with gr.Column():
                    gc_img = gr.Image(type="pil", label="Rasm yuklang")
                    gc_target = gr.Dropdown(list(settings.class_names), label="Tahlil yo'nalishi")
                    gc_alpha = gr.Slider(0.1, 0.9, value=0.5, label="Shaffoflik")
                    btn_gc = gr.Button("🔥 Heatmap yaratish")
                with gr.Column():
                    gc_out = gr.Image(type="pil", label="Visualizatsiya")
                    gc_status = gr.Markdown("Holat: --")
            btn_gc.click(app_gradcam, [gc_img, gc_target, gc_alpha], [gc_out, gc_status])

        with gr.Tab("📹 Live AI Video Analysis"):
            gr.Markdown("### 🎥 Veb-kamera orqali jonli tahlil")
            with gr.Row():
                with gr.Column():
                    v_in = gr.Image(sources=["webcam"], streaming=True, label="Jonli kamera")
                with gr.Column():
                    v_out = gr.Image(label="AI Stream")
                    v_status = gr.Markdown("Kamera kutilmoqda...")
            
            v_in.stream(app_video_predict, [v_in], [v_out, v_status])

        with gr.Tab("📂 Dataset Explorer"):
            gr.Markdown("### 🖼 HAM10000 Dataset Galereyasi")
            with gr.Row():
                with gr.Column(scale=1):
                    exp_class = gr.Dropdown(["akiec", "bcc", "bkl", "df", "mel", "nv", "vasc"], label="Kategoriya bo'yicha filtr")
                    exp_limit = gr.Slider(5, 50, value=15, step=5, label="Rasmlar soni")
                    btn_exp = gr.Button("🔄 Ma'lumotlarni yuklash", variant="primary")
                with gr.Column(scale=3):
                    exp_gal = gr.Gallery(label="Dataset namunalari", columns=5, height="auto")
                    exp_status = gr.Markdown("Tayyor.")
            
            btn_exp.click(get_dataset_samples, [exp_limit, exp_class], [exp_gal, exp_status])

    gr.Markdown("---")
    gr.Markdown("⚠️ **Eslatma:** Ushbu tizim faqat yordamchi vositadir. Phase 6: Advanced Features (Ensemble, Segmentation, Video) faollashtirildi.")

if __name__ == "__main__":
    demo.launch(server_port=7862)
