# Image Recognition Based Content Trigger System (Updated)

## Overview

This system allows users to upload an image, attach multimedia content (video, audio, image URL, or text) to that image, and later trigger the attached content when the same image is detected through real‑time webcam scanning. The updated version replaces classical feature matching with deep learning‑based image embeddings for superior accuracy, scalability, and robustness under real‑world conditions.

---

## Key Improvements

- **Deep learning embeddings** – Instead of ORB descriptors, we use a pretrained model (ResNet‑50, EfficientNet, or CLIP) to extract compact, discriminative feature vectors.
- **Vector search at scale** – Embeddings are indexed with FAISS (or Milvus) for sub‑second similarity search among millions of reference images.
- **Hybrid geometric verification** – Optional ORB + homography check on top‑k candidates for ultra‑high precision.
- **Real‑time streaming** – WebRTC video streaming to a GPU‑accelerated backend for low‑latency processing.
- **Intelligent trigger logic** – Confidence scoring with calibrated thresholds, cooldown periods, and user feedback loops.
- **Modern tech stack** – Python + FastAPI, React/Next.js, MongoDB (metadata) + vector database, Redis for caching.

---

## Workflow

### Step 1: Image Upload & Fingerprinting

- User uploads an image.
- System extracts a deep embedding (e.g., 2048‑d vector) using a pretrained neural network.
- The embedding is stored in a vector index (FAISS) along with a reference ID; metadata (image name, timestamp) is saved in MongoDB.
- **No raw image is used for detection**, only the embedding.

### Step 2: Attach Content

User attaches content of any supported type:

- Video (URL or file path)
- Audio
- Image URL
- Text content

The database records:

- Image ID (foreign key to vector index)
- Content type
- Content URL or data
- Timestamp

### Step 3: Real‑Time Image Scanning

- User activates webcam scanning from the frontend.
- Frames are streamed via WebRTC to the backend.
- For each frame (or every Nth frame), a deep embedding is extracted.
- The embedding is queried against the FAISS index to retrieve the top‑k most similar reference images.
- If the similarity score of the top match exceeds a confidence threshold (and optionally passes geometric verification), the corresponding content is triggered.
- Trigger events are sent back to the frontend via WebSocket, and the attached content is displayed/played.

---

## System Architecture
Webcam → WebRTC → Backend (FastAPI + GPU) → Embedding Extraction → FAISS Search
↑ |
| ↓
Frontend (React) ← WebSocket ← Trigger Decision ← (Optional Geometric Check)

text

- **Frontend**: React/Next.js with WebRTC client.
- **Backend**: Python FastAPI, PyTorch/TensorFlow for embedding extraction, FAISS for vector search.
- **Database**: MongoDB (metadata), FAISS index (embeddings), Redis (cooldown cache).
- **Communication**: WebRTC for video, WebSocket for events.

---

## Technology Stack

| Component          | Technology                                      |
|--------------------|-------------------------------------------------|
| Backend            | Python + FastAPI, PyTorch / TensorFlow          |
| Frontend           | React / Next.js, WebRTC client                   |
| Vector Database    | FAISS (in‑memory) or Milvus (distributed)       |
| Metadata Database  | MongoDB                                         |
| Caching            | Redis                                           |
| Real‑time Comms    | WebRTC (video), WebSocket (events)              |
| Deployment         | Docker, Kubernetes, GPU nodes                    |

---

## Database Schema Example

### MongoDB (metadata)
```json
{
  "_id": "image_id",
  "imageName": "example_image",
  "contentType": "video",
  "contentURL": "https://example.com/video.mp4",
  "createdAt": "2025-01-01T00:00:00Z"
}
FAISS Index
Stores (embedding_vector, image_id) pairs.

Index type: IndexFlatIP (inner product) or IndexIVFFlat for large‑scale.

Redis Cache
Key: cooldown:<image_id>

Value: timestamp of last trigger

TTL: configurable (e.g., 5 seconds)

Detection Logic (Pseudocode)
python
# Offline indexing
for ref_image in reference_images:
    emb = extract_embedding(ref_image)
    faiss_index.add(emb, ref_image.id)
    mongodb.insert(ref_image.metadata)

# Real‑time processing
frame = await get_webcam_frame()
emb = extract_embedding(frame)
scores, indices = faiss_index.search(emb, k=5)   # top‑5 candidates

best_match = None
best_score = 0
for i, idx in enumerate(indices[0]):
    if scores[0][i] > CONFIDENCE_THRESHOLD:
        # Optional geometric verification
        if verify_with_orb_homography(frame, idx):
            best_match = idx
            best_score = scores[0][i]
            break

if best_match and not is_in_cooldown(best_match):
    trigger_content(best_match)
    set_cooldown(best_match, COOLDOWN_SECONDS)
    notify_frontend(best_match, best_score)
Performance Optimization
Frame downscaling – Resize frames to 224×224 before embedding extraction.

Skipping frames – Process only every 3rd–5th frame to reduce load.

GPU acceleration – Embedding extraction runs on GPU (NVIDIA CUDA).

Vector index tuning – Use IVF indexes with appropriate number of clusters for the dataset size.

Caching – Recently triggered images are skipped via Redis cooldown.

Asynchronous processing – FastAPI with async endpoints and background tasks.

Future Enhancements
Active learning – Fine‑tune embedding model on user‑confirmed matches.

Multi‑image detection – Recognize several reference images in one frame.

AR overlay – Overlay triggered content directly on the live video.

Mobile support – Optimize frontend for iOS/Android with native WebRTC.

Federated search – Combine multiple vector indexes for cross‑tenant deployments.

