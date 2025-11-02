# backend/app.py
from fastapi import FastAPI, HTTPException
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO
import cv2
import numpy as np
import warnings
import logging
import zxingcpp
import requests
from pydantic import BaseModel

class ScanRequest(BaseModel):
    product: dict          # Product data from Open Food Facts
    user_preferences: dict # {diet, allergies, healthConcerns}

# Suppress warnings/logs
warnings.filterwarnings("ignore")
logging.getLogger("ultralytics").setLevel(logging.ERROR)

app = FastAPI()
# Allow Angular app on localhost:4200
origins = [
    "http://localhost:4200",
    "http://127.0.0.1:4200"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,         # or ["*"] to allow all origins (less secure)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load YOLOv8 model
model = YOLO("https://huggingface.co/Piero2411/YOLOV8s-Barcode-Detection/resolve/main/YOLOV8s_Barcode_Detection.pt")
def enhance_image(roi):
    """
    Applies a series of image enhancement techniques and binarization to the ROI.
    """
    # Convert to grayscale
    gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
    
    # Increase brightness and contrast (simple gamma correction)
    gamma = 1.5
    enhanced = np.power(gray / 255.0, gamma)
    enhanced = (enhanced * 255).astype("uint8")

    # Apply adaptive histogram equalization (CLAHE) to improve local contrast
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(enhanced)

    # Aggressive sharpening filter
    sharpening_kernel = np.array([
        [-1, -1, -1],
        [-1, 9, -1],
        [-1, -1, -1]
    ], dtype=np.float32)
    sharpened = cv2.filter2D(enhanced, -1, sharpening_kernel)
    
    # Upscale the image to make thin lines more distinct
    upscaled = cv2.resize(sharpened, None, fx=2.0, fy=2.0, interpolation=cv2.INTER_LANCZOS4)
    
    # --- NEW: Binarization (Thresholding) Step ---
    # Apply Otsu's thresholding to convert to black and white
    # This is a key step to achieve the look of image_258658.png
    _, binarized = cv2.threshold(upscaled, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    
    return binarized

@app.post("/scan/")
async def scan_barcode_v5(file: UploadFile = File(...)):
    # Read uploaded image
    image_bytes = await file.read()
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    # Run YOLOv8 prediction
    results = model.predict(source=img, save=False, verbose=False)
    res = results[0]

    barcodes = []
    
    for i, box in enumerate(res.boxes.xyxy.cpu().numpy()):
        x1, y1, x2, y2 = map(int, box)
        
        # Increased padding to capture the quiet zone and handle distortion
        pad = 50  
        h, w = img.shape[:2]
        x1m, y1m = max(0, x1 - pad), max(0, y1 - pad)
        x2m, y2m = min(w, x2 + pad), min(h, y2 + pad)
        
        roi_padded = img[y1m:y2m, x1m:x2m]
        
        # Save the padded ROI for inspection
        cv2.imwrite(f"roi_v5_padded_{i}.jpg", roi_padded)
        
        # Apply the multi-stage enhancement
        enhanced_roi = enhance_image(roi_padded)
        
        # Save the fully enhanced image for visual confirmation
        cv2.imwrite(f"roi_v5_enhanced_{i}.jpg", enhanced_roi)

        # Try decoding the enhanced image first
        zxing_results = zxingcpp.read_barcodes(enhanced_roi)

        if not zxing_results:
            # Fallback to the original padded ROI if enhancement fails
            zxing_results = zxingcpp.read_barcodes(roi_padded)
            
        for result in zxing_results:
            barcodes.append(result.text)

    # Annotated YOLO image for debugging
    annotated_img = res.plot()
    cv2.imwrite("annotated_v5.jpg", annotated_img)

    return {"barcodes": list(set(barcodes)) if barcodes else None}


@app.post("/recommend/")
async def recommend_healthier(scan_req: ScanRequest):
    try:
        product = scan_req.product
        user_prefs = scan_req.user_preferences

        # --- Validate Inputs ---
        if not product:
            raise HTTPException(status_code=400, detail="Missing product data.")
        if not user_prefs:
            raise HTTPException(status_code=400, detail="Missing user preferences.")

        # --- Extract Product Category ---
        categories = (
            product.get("categories_tags") or
            product.get("categories_hierarchy") or
            [product.get("category")] if product.get("category") else []
        )
        if not categories:
            raise HTTPException(status_code=404, detail="No category data found for product.")

        category = categories[-1]  # Most specific category
        url = f"https://world.openfoodfacts.org/category/{category}.json?page_size=100"

        # --- Fetch Category Data ---
        response = requests.get(url, timeout=10)
        if response.status_code != 200:
            raise HTTPException(status_code=502, detail=f"Failed to fetch data from OpenFoodFacts (status {response.status_code})")

        data = response.json()
        candidates = data.get("products", [])
        if not candidates:
            raise HTTPException(status_code=404, detail="No candidate products found in category.")

        # --- Health Score Logic ---
        def health_score(p):
            nutr = p.get("nutriments", {})
            score = 0
            if "nutri_score_grade" in p:
                score += {"a": 5, "b": 4, "c": 3, "d": 2, "e": 1}.get(p["nutri_score_grade"], 0)
            score += max(0, 5 - nutr.get("sugars_100g", 0) / 5)
            score += max(0, 5 - nutr.get("saturated-fat_100g", 0) / 2)
            score += max(0, 5 - nutr.get("salt_100g", 0) / 0.5)
            score += nutr.get("fiber_100g", 0) / 2
            score += nutr.get("protein_100g", 0) / 5
            return score

        base_score = health_score(product)
        scored = [
            {**p, "health_score": health_score(p)}
            for p in candidates if "nutriments" in p
        ]
        healthier = [p for p in scored if p["health_score"] > base_score]
        healthier.sort(key=lambda x: x["health_score"], reverse=True)

        # --- Take Top 5 Healthier Alternatives ---
        top5 = [
            {
                "name": p.get("product_name"),
                "brand": p.get("brands"),
                "image": p.get("image_small_url"),
                "nutri_score": p.get("nutri_score_grade"),
                "url": p.get("url"),
            }
            for p in healthier[:5]
        ]

        # --- Fallback: If No Healthier Alternatives ---
        if not top5:
            return {
                "message": "No healthier alternatives found in the same category.",
                "recommendations": [],
            }

        return {"recommendations": top5}

    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"External API error: {str(e)}")

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")