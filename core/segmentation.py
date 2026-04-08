import cv2
import numpy as np
from PIL import Image
from dataclasses import dataclass

@dataclass
class SegmentationResult:
    mask: np.ndarray
    overlay: Image.Image
    area_pixels: int
    area_mm2: float | None = None
    perimeter_pixels: int = 0

class LesionSegmenter:
    def __init__(self, pp_mm: float = 0.1): 
        """
        pp_mm: pixels per mm scale. Default 0.1mm per pixel.
        """
        self.scale = pp_mm

    def segment(self, img_pil: Image.Image) -> SegmentationResult:
        # Convert PIL to CV2
        img = cv2.cvtColor(np.array(img_pil), cv2.COLOR_RGB2BGR)
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # 1. Preprocessing (Blur and Threshold)
        blur = cv2.GaussianBlur(gray, (5, 5), 0)
        
        # Use Otsu's thresholding
        _, mask = cv2.threshold(blur, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
        
        # 2. Cleanup (Morphological operations)
        kernel = np.ones((5, 5), np.uint8)
        mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel, iterations=2)
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=2)
        
        # 3. Find Largest Contour
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        area_px = 0
        perimeter = 0
        overlay_img = img.copy()
        final_mask = np.zeros_like(gray)

        if contours:
            largest_cnt = max(contours, key=cv2.contourArea)
            area_px = cv2.contourArea(largest_cnt)
            perimeter = cv2.arcLength(largest_cnt, True)
            
            # Draw on overlay
            cv2.drawContours(overlay_img, [largest_cnt], -1, (0, 255, 0), 2)
            cv2.drawContours(final_mask, [largest_cnt], -1, 255, -1)
            
        # 4. Calculate mm2
        area_mm2 = area_px * (self.scale ** 2)
        
        # Convert back to PIL
        overlay_pil = Image.fromarray(cv2.cvtColor(overlay_img, cv2.COLOR_BGR2RGB))
        
        return SegmentationResult(
            mask=final_mask,
            overlay=overlay_pil,
            area_pixels=int(area_px),
            area_mm2=area_mm2,
            perimeter_pixels=int(perimeter)
        )

# Global Instance
segmenter = LesionSegmenter()
