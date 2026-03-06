# RevealAR (noQR) Project Documentation

## 🚀 Overview
**RevealAR** is an advanced Image-Recognition based Augmented Reality (AR) platform. Unlike traditional QR codes, RevealAR allows users to "scan" real-world images (Markers) to reveal digital content like videos, 3D animations, music, or confidential text.

---

## 🏗️ Project Structure
The project is divided into three main components:
1.  **Backend (Python/FastAPI)**: The brain of the system. It handles image processing, database management, and the matching engine.
2.  **Frontend (Next.js)**: A web dashboard for creators to upload images, manage AR content, and view analytics.
3.  **Scanner App (Next.js/Mobile-Ready)**: A dedicated mobile-optimized experience for scanning markers and viewing AR content.

---

## 🛠️ Technology Stack

### **1. Backend (The Logic)**
-   **FastAPI**: A high-performance web framework for building APIs with Python.
-   **MongoDB (Motor)**: NoSQL database used to store project details, content metadata, and engagement analytics.
-   **FAISS (Facebook AI Similarity Search)**: A library for efficient similarity search. It is used to match a "scanned frame" against thousands of uploaded images in milliseconds.
-   **PyTorch & Torchvision**: Used to generate "Embeddings" (unique numerical fingerprints) of images using deep learning models (ResNet).
-   **OpenCV & Pillow**: Used for image preprocessing, resizing, and manipulation.
-   **Invisible Watermarking**: Used to embed hidden data into images for authenticity and tracking.

### **2. Frontend & Scanner (The Interface)**
-   **Next.js 14**: Modern React framework for high-performance web applications.
-   **Tailwind CSS**: For premium, responsive UI/UX design.
-   **Framer Motion**: For smooth animations and transitions.
-   **React-Webcam**: To access device cameras directly in the browser.
-   **Lucide React**: For a clean and professional icon system.

---

## 🔄 How It Works (The Lifecycle)

### **Step 1: Upload & Indexing**
1.  A user uploads a **Target Image** (Marker) and attaches **Content** (Video, Audio, or Text).
2.  The Backend processes the image using a **Neural Network** to create a "Vector Embedding."
3.  This embedding is stored in the **FAISS Index**.

### **Step 2: Scanning & Matching**
1.  When a user opens the **Scanner**, the camera captures frames in real-time.
2.  The frame is sent to the `/scan` API.
3.  The Backend calculates the embedding of the current frame and compares it with the FAISS Index.
4.  If a match is found with high confidence, the Backend returns the associated content ID.

### **Step 3: Content Delivery**
1.  The Scanner receives the content metadata.
2.  It displays the AR content (e.g., a video overlay or a 3D-like display) using the `ScannerDisplay` component.
3.  Analytics are logged (how many people scanned, for how long, etc.).

---

## 🌟 Key Features
-   **Direct Camera Access**: No need for a separate app download; works directly in the browser.
-   **Instant Matching**: FAISS allows for lightning-fast recognition even with large datasets.
-   **Analytics Dashboard**: Track engagement, clicks, and scan counts.
-   **Cross-Platform**: Works on both Mobile (iOS/Android) and Desktop (Laptops/PCs).
-   **Secure Storage**: Content is mapped securely, and markers are protected with watermarking.

---

## 📂 Folder Breakdown
-   `/backend`: API server, FAISS logic, and database models.
-   `/frontend`: Main dashboard and creator tools.
-   `/scanner-app`: Standalone scanning experience for mobile users.
-   `/uploads`: Storage for uploaded images and videos.

---

**RevealAR: Bringing static images to life.**
