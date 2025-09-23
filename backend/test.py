# from PIL import Image
# from pyzxing import BarCodeReader
# import numpy as np

# def scan_with_pyzxing(image_path):
#     """
#     Replicates the successful zxing-js decoding logic in Python.
    
#     Args:
#         image_path (str): The path to the image file.
        
#     Returns:
#         str or None: The detected barcode value, or None if no barcode is found.
#     """
#     reader = BarCodeReader()
    
#     try:
#         pil_image = Image.open(image_path)
#     except FileNotFoundError:
#         print("Error: Image not found.")
#         return None
        
#     gray_image = pil_image.convert('L')
#     np_image = np.array(gray_image)
    
#     # Corrected call without the unsupported 'formats_as_string' argument
#     results = reader.decode_array(np_image)

#     if results:
#         # The result object's keys might vary, use 'parsed' for the barcode value
#         return results[0]['parsed']
#     else:
#         return None

# # --- Example Usage ---

# # Replace with the correct paths to your images.
# image_paths = [
#     "roi_v5_enhanced_0.jpg"]

# for img_path in image_paths:
#     print(f"Scanning {img_path}...")
#     barcode = scan_with_pyzxing(img_path)
#     if barcode:
#         print(f"  - Barcode detected: {barcode}\n")
#     else:
#         print("  - No barcode detected.\n")

import os
from dotenv import load_dotenv
import google.generativeai as genai

# Load .env
load_dotenv()

# Configure Gemini client
genai.configure(api_key=os.getenv("OPENAI_API_KEY"))

# Pick a model (Gemini 1.5 Pro or Gemini 1.5 Flash are common choices)
model = genai.GenerativeModel(os.getenv("OPENAI_MODEL"))

# Make a request
response = model.generate_content("Hi sweety!")

print(response.text)
