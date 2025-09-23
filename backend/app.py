# backend/app.py
from http.client import HTTPException
import json
import re
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO
import cv2
import numpy as np
import warnings
import logging
import zxingcpp
import os
from dotenv import load_dotenv
import google.generativeai as genai
from pydantic import BaseModel

# Load .env
load_dotenv()

# Configure Gemini client
genai.configure(api_key=os.getenv("OPENAI_API_KEY"))
model = genai.GenerativeModel(os.getenv("OPENAI_MODEL"))

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

def safe_parse_json(text: str):
    match = re.search(r'\{.*\}', text, re.DOTALL)
    if not match:
        raise ValueError("No JSON found in AI response")
    return json.loads(match.group())

color_map = {'green': 'primary', 'orange': 'accent', 'red': 'warn'}

@app.post("/analyze/")

@app.post("/analyze/")
async def analyze_product(scan: ScanRequest):
    product = scan.product
    prefs = scan.user_preferences

    prompt = f"""
    You are a nutrition expert. Return ONLY a valid JSON object analyzing the product.
    Product: {product.get('product_name')}
    User preferences: {prefs}
    """

    # Call AI model
    response = model.generate_content(prompt)
    raw_text = response.text
    print("Raw AI response:", raw_text)  # Make sure this prints in server logs

    # Attempt to extract JSON from text
    try:
        # First try direct JSON parse
        result = json.loads(raw_text)
    except json.JSONDecodeError:
        # Try to extract JSON substring (common if AI prepends/explains)
        match = re.search(r'\{.*\}', raw_text, re.DOTALL)
        if match:
            try:
                result = json.loads(match.group())
            except json.JSONDecodeError as e:
                print("JSON extraction failed:", e)
                raise HTTPException(status_code=500, detail=f"Invalid JSON from AI: {raw_text[:200]}")
        else:
            raise HTTPException(status_code=500, detail=f"No JSON found in AI response: {raw_text[:200]}")

    return result


# async def analyze_product(scan: ScanRequest):
    product = scan.product
    prefs = scan.user_preferences

    if not product:
        raise HTTPException(status_code=400, detail="Product data is required")

    prompt = f"""
        You are a nutrition expert. Analyze the following product ingredients and nutritional info:
        Product: {product.get('product_name')}
        Brand: {product.get('brands')}
        Ingredients: {product.get('ingredients_text', 'Unknown')}
        Nutrients: {product.get('nutrient_levels', {})}
        Allergens: {product.get('allergens', 'None')}
        User preferences: {prefs}
        Return valid JSON as specified
    """

    response = model.generate_content(prompt)

    try:
        result = safe_parse_json(response.text)
        result['color'] = color_map.get(result.get('color'), 'primary')
        for n in result.get('nutrients', []):
            n['levelColor'] = color_map.get(n.get('levelColor'), 'primary')
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI response invalid JSON: {e}")

    return result