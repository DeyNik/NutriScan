# NutriScan

**NutriScan** is a Progressive Web App (PWA) that performs real-time health analysis of packaged food products using barcode scanning, live product data, and AI-powered recommendations. The application helps users instantly evaluate the nutritional quality of food items and discover healthier alternatives.

---

## Problem Statement

Most existing food analysis apps depend on static databases and manual data entry, which can be:

* Time-consuming
* Error-prone
* Limited in accuracy
* Difficult to use on the go

NutriScan addresses these challenges by automating the entire process using barcode scanning and artificial intelligence.

---

## Features

* **Barcode Scanning** using mobile or desktop camera
* **Live Product Data Retrieval** from OpenFoodFacts
* **AI-Based Ingredient Analysis** using OpenAI API
* **Health Score Interpretation**
* **Healthier Alternative Recommendations**
* **Firebase Authentication**
* **Cloud Storage of Scan History**
* **Progressive Web App Support** (Installable on mobile and desktop)
* **OCR Fallback** for unreadable barcodes *(planned)*

---

## Technology Stack

### Frontend

* Angular Progressive Web App
* Camera integration for barcode scanning

### Backend

* Python Software Foundation
* FastAPI for API orchestration

### AI

* gemini API for ingredient analysis and recommendations

### External APIs

* Open Food Facts for real-time product information

### Database & Hosting

* Firebase for:

  * Authentication
  * Cloud Firestore
  * Storage
  * Hosting

---

## ⚙️ Installation and Setup

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/nutriscan.git
cd nutriscan
```

---

### 2. Frontend Setup (Angular)

```bash
cd frontend
npm install
ng serve
```

Frontend runs at:

```text
http://localhost:4200
```

---

### 3. Backend Setup (FastAPI)

```bash
cd backend
python -m venv venv
source venv/bin/activate      # Linux/macOS
venv\Scripts\activate         # Windows

pip install -r requirements.txt
uvicorn main:app --reload
```

Backend runs at:

```text
http://localhost:8000
```

---

### 4. Configure Environment Variables

Create a `.env` file in the backend directory:

```env
OPENAI_API_KEY=your_openai_api_key
FIREBASE_CREDENTIALS=path/to/firebase-admin-sdk.json
```

---

### 5. Firebase Setup

1. Create a project in Firebase.
2. Enable Authentication.
3. Enable Firestore Database.
4. Download service account credentials.
5. Add Firebase config to the Angular app.


## Acknowledgements

* Open Food Facts
* OpenAI
* Google Firebase
* Google Angular
* FastAPI
