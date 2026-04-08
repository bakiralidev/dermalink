import os
from datetime import datetime
from pathlib import Path
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, Table, TableStyle
from reportlab.lib.units import inch

class ReportGenerator:
    def __init__(self, output_dir: str = "reports/pdf"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()

    def _setup_custom_styles(self):
        self.styles.add(ParagraphStyle(
            name='CenterHeader',
            parent=self.styles['Heading1'],
            alignment=1,
            spaceAfter=20,
            textColor=colors.hexColor("#2c3e50")
        ))
        self.styles.add(ParagraphStyle(
            name='WarningStyle',
            parent=self.styles['Normal'],
            textColor=colors.red,
            fontSize=10,
            alignment=1,
            spaceBefore=20
        ))

    def generate(self, data: dict, original_img_path: str, heatmap_img_path: str = None) -> str:
        """
        Generates a professional PDF report.
        data example: {
            "lesion_id": "L100",
            "age": 45,
            "sex": "Male",
            "localization": "Back",
            "diagnosis": "Melanoma",
            "confidence": 0.89,
            "top_3": [("Melanoma", 0.89), ("NV", 0.05), ("BKL", 0.02)]
        }
        """
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"Report_{data['lesion_id']}_{timestamp}.pdf"
        filepath = self.output_dir / filename
        
        doc = SimpleDocTemplate(str(filepath), pagesize=A4)
        elements = []

        # 1. Header
        elements.append(Paragraph("Skin AI Mastery - Diagnostic Report", self.styles['CenterHeader']))
        elements.append(Paragraph(f"Hisobot sanasi: {datetime.now().strftime('%Y-%m-%d %H:%M')}", self.styles['Normal']))
        elements.append(Spacer(1, 0.2 * inch))

        # 2. Patient Info Table
        patient_data = [
            ["ID (Lesion):", data.get("lesion_id", "N/A"), "Jinsi:", data.get("sex", "N/A")],
            ["Yoshi:", str(data.get("age", "N/A")), "Lokalizatsiya:", data.get("localization", "N/A")]
        ]
        t = Table(patient_data, colWidths=[1.2*inch, 1.8*inch, 1.2*inch, 1.8*inch])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (0,1), colors.lightgrey),
            ('BACKGROUND', (2,0), (2,1), colors.lightgrey),
            ('GRID', (0,0), (-1,-1), 1, colors.grey),
            ('PADDING', (0,0), (-1,-1), 6),
        ]))
        elements.append(t)
        elements.append(Spacer(1, 0.3 * inch))

        # 3. Diagnosis Results
        elements.append(Paragraph("📊 AI Diagnostika Xulosasi:", self.styles['Heading2']))
        elements.append(Paragraph(f"<b>Asosiy Tashxis:</b> {data['diagnosis']} ({data['confidence']:.1%})", self.styles['Normal']))
        if data.get("area_mm2"):
            elements.append(Paragraph(f"<b>Jarohat O'lchami:</b> {data['area_mm2']:.2f} mm²", self.styles['Normal']))
        elements.append(Spacer(1, 0.1 * inch))

        if data.get("warning"):
            elements.append(Paragraph(f"🔔 <b>DIQQAT:</b> {data['warning']}", self.styles['WarningStyle']))
            elements.append(Spacer(1, 0.1 * inch))

        # Probabilities Table
        prob_data = [["Kategoriya", "Ehtimollik"]]
        for name, prob in data.get("top_3", []):
            prob_data.append([name, f"{prob:.1%}"])
        
        pt = Table(prob_data, hAlign='LEFT')
        pt.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (1,0), colors.hexColor("#34495e")),
            ('TEXTCOLOR', (0,0), (1,0), colors.whitesmoke),
            ('GRID', (0,0), (-1,-1), 0.5, colors.grey),
            ('PADDING', (0,0), (-1,-1), 5),
        ]))
        elements.append(pt)
        elements.append(Spacer(1, 0.3 * inch))

        # 4. Images (Side by Side if possible)
        elements.append(Paragraph("🖼 Vizual Tahlil (Original va Heatmap):", self.styles['Heading2']))
        
        try:
            img_list = []
            # Logic to resize image to fit report
            def get_fixed_img(path):
                img = Image(path)
                aspect = img.imageWidth / img.imageHeight
                img.drawWidth = 2.5 * inch
                img.drawHeight = 2.5 * inch / aspect
                return img

            row_imgs = [get_fixed_img(original_img_path)]
            if heatmap_img_path and os.path.exists(heatmap_img_path):
                row_imgs.append(get_fixed_img(heatmap_img_path))
            
            it = Table([row_imgs])
            elements.append(it)
        except Exception as e:
            elements.append(Paragraph(f"Rasm yuklashda hatolik: {e}", self.styles['Normal']))

        # 5. Bottom Disclaimer
        elements.append(Paragraph(
            "⚠️ <b>DIQQAT:</b> Ushbu hisobot sun'iy intellekt tomonidan generatsiya qilingan. "
            "U faqat yomon sifatli (malignant) o'zgarishlarni aniqlashda yordamchi vosita bo'lib xizmat qiladi. "
            "Yakuniy tashxis qo'yish uchun shifokor bilan maslahatlashing.",
            self.styles['WarningStyle']
        ))

        doc.build(elements)
        return str(filepath)

# Global Instance
pdf_gen = ReportGenerator()
