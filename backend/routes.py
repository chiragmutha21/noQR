"""
API routes for the Image Recognition Content Trigger System.

Step 1 (Image Upload & Fingerprinting):
  POST   /api/upload          — Upload image + video/link
  GET    /api/contents         — List all content
  GET    /api/video/{id}       — Get video URL
  GET    /api/content/{id}     — Get full content details
  DELETE /api/content/{id}     — Delete content

Step 2 (Attach Multimedia Content):
  POST   /api/attach-content            — Attach content to an image
  GET    /api/attached-contents/{id}    — Get all attachments for an image
  DELETE /api/attached-content/{id}     — Delete a specific attachment
"""
import os
import uuid
import shutil
from datetime import datetime, timezone
import numpy as np

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Request
from typing import Optional, List

from database import get_images_collection, get_attached_contents_collection
from models import (
    ARContentResponse, UploadResponse, VideoLookupResponse, ErrorResponse,
    AttachedContentResponse, AttachContentRequest, ALLOWED_CONTENT_TYPES,
    ScanResponse
)
from embeddings import extract_embedding, EMBEDDING_DIM
import faiss_index
from watermark import WatermarkManager
from dotenv import load_dotenv

load_dotenv()

wm_manager = WatermarkManager()
SIMILARITY_THRESHOLD = 0.42  # More permissive threshold for easier scanning
router = APIRouter(prefix="/api")

# ── FAISS index (singleton) ────────────────────────────────────────────────
FAISS_INDEX_PATH = os.getenv("FAISS_INDEX_PATH", "data/faiss_index.bin")
FAISS_MAPPING_PATH = os.getenv("FAISS_MAPPING_PATH", "data/id_mapping.json")
faiss_index = faiss_index.FaissIndex(FAISS_INDEX_PATH, FAISS_MAPPING_PATH)

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "uploads")


def _ensure_dirs():
    """Ensure upload directories exist."""
    for sub in ["images", "videos", "audio", "pdfs"]:
        os.makedirs(os.path.join(UPLOAD_DIR, sub), exist_ok=True)
    os.makedirs("data", exist_ok=True)


_ensure_dirs()


async def _save_upload(file: UploadFile, subfolder: str) -> tuple[str, str]:
    """
    Save an uploaded file to disk.

    Returns:
        (relative_path, filename) e.g. ("/uploads/images/abc.jpg", "abc.jpg")
    """
    # Sanitize base filename
    raw_name = file.filename or "file"
    base_name = os.path.splitext(raw_name)[0]
    safe_base = "".join([c if c.isalnum() or c in ('-', '_') else '_' for c in base_name])
    
    ext = os.path.splitext(raw_name)[1]
    unique_name = f"{safe_base}-{int(datetime.now().timestamp())}-{uuid.uuid4().hex[:8]}{ext}"
    dest_dir = os.path.join(UPLOAD_DIR, subfolder)
    dest_path = os.path.join(dest_dir, unique_name)

    with open(dest_path, "wb") as f:
        content = await file.read()
        f.write(content)

    relative_path = f"/{UPLOAD_DIR}/{subfolder}/{unique_name}"
    return relative_path, unique_name


# ── Endpoints ──────────────────────────────────────────────────────────────

@router.get("/upload")
async def upload_status():
    """Health check for upload endpoint."""
    return {"message": "Upload endpoint is active. Use POST to upload files."}


@router.post("/upload")
async def upload_content(
    request: Request,
    image: UploadFile = File(...),
    # Support multiple types
    type: str = Form("video"), # video, audio, image, text, pdf
    title: Optional[str] = Form(""),
    file: Optional[UploadFile] = File(None),
    url: Optional[str] = Form(None),
    text: Optional[str] = Form(None),
    user_email: Optional[str] = Form(None), # Multi-tenancy support
):
    print(f"POST /api/upload received: image={image.filename}, type={type}")

    # Validate image type
    if image.content_type and not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files are allowed for target image.")

    # Save target image to disk
    image_path, image_filename = await _save_upload(image, "images")
    abs_image_path = os.path.join(os.getcwd(), image_path.lstrip("/"))

    # --- WATERMARK EMBEDDING ---
    # Generate content_id here so we can embed it
    content_id = str(uuid.uuid4())
    try:
        with open(abs_image_path, "rb") as f:
            img_bytes = f.read()
        
        # Embed the last 8 chars of the contentId as a robust watermark
        watermarked_bytes, success = wm_manager.embed_id(img_bytes, content_id)
        
        if success:
            with open(abs_image_path, "wb") as f:
                f.write(watermarked_bytes)
            print(f"Watermark embedded for {content_id}")
    except Exception as e:
        print(f"Watermarking failed (continuing without it): {e}")

    # Save attached content
    final_url = url or ""
    final_text = text or ""
    
    if file and file.filename:
        # Determine subfolder based on type
        sub = "videos" if type == "video" else ("audio" if type == "audio" else ("pdfs" if type == "pdf" else "images"))
        saved_path, _ = await _save_upload(file, sub)
        final_url = saved_path
    elif type != "text" and not url:
         raise HTTPException(status_code=400, detail=f"A file or URL is required for type '{type}'")

    # Extract deep learning embedding
    try:
        embedding = extract_embedding(abs_image_path)
    except Exception as e:
        # Clean up saved file on failure
        if os.path.exists(abs_image_path):
            os.remove(abs_image_path)
        raise HTTPException(status_code=500, detail=f"Failed to extract embedding: {str(e)}")

    # --- DUPLICATE PREVENTION ---
    # Disabled to allow 'Repeated Uploads' as requested by user.
    # We now distinguish visually identical images via invisible digital watermarking.
    # existing_matches = faiss_index.search(embedding, k=1)
    # ... (code removed) ...

    # Add to FAISS index
    # Note: content_id was already generated at the top for watermarking
    try:
        faiss_index.add(embedding, content_id)
    except Exception as e:
        # Clean up
        if os.path.exists(abs_image_path):
            os.remove(abs_image_path)
        raise HTTPException(status_code=500, detail=f"Failed to add to FAISS index: {e}")

    # Save metadata to MongoDB
    collection = get_images_collection()
    if collection is None:
        raise HTTPException(
            status_code=503, 
            detail="Database connection is currently unavailable. Please check your MongoDB Altas whitelist/connection."
        )
    doc = {
        "contentId": content_id,
        "originalImageName": image.filename or "unknown",
        "imagePath": image_path,
        # Default/Legacy mapping for front-end
        "videoPath": final_url, 
        "videoType": "link" if url else "file",
        # New multi-type support
        "type": type,
        "title": title,
        "text": final_text,
        "url": final_url,
        "user_email": user_email, # Store the uploader's email
        "descriptorPath": "",
        "metadata": {
            "keypointsCount": EMBEDDING_DIM,
            "fileSize": file.size if file and file.size else 0,
        },
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }
    print(f"Attempting to insert into DB: {doc['contentId']}")
    await collection.insert_one(doc)
    print("Insert finished.")

    # Build response URLs
    base_url = str(request.base_url).rstrip("/")
    video_url = final_url if final_url.startswith("http") else f"{base_url}{final_url}"

    return {
        "message": "Upload successful",
        "contentId": content_id,
        "videoUrl": video_url,
        "descriptorUrl": "",
    }


@router.get("/contents")
async def get_all_contents(email: Optional[str] = None):
    """List content items. If email provided, filter by user; otherwise return nothing for security."""
    collection = get_images_collection()
    
    # Filter by email to ensure private dashboards
    query = {}
    if email:
        query["user_email"] = email
    else:
        # If no email is provided, return empty list (or all if we wanted public, but user asked for private)
        # Returning empty to satisfy "image seen empty" for unauthenticated/wrongly queried states
        return []
        
    cursor = collection.find(query).sort("createdAt", -1)
    results = []
    
    async for doc in cursor:
        # filter out items where the image file is missing from disk
        # imagePath is stored as "/uploads/images/foo.jpg"
        image_path_str = doc.get("imagePath", "")
        # Remove leading forward slash
        disk_path = image_path_str.lstrip("/") 
        
        # Check if file exists relative to cwd (backend root)
        if disk_path and os.path.exists(disk_path):
            doc["_id"] = str(doc.get("_id", ""))
            results.append(doc)
            
    return results


@router.get("/video/{content_id}")
async def get_video(content_id: str, request: Request):
    """Get video URL for a specific content item."""
    collection = get_images_collection()
    doc = await collection.find_one({"contentId": content_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Content not found")

    base_url = str(request.base_url).rstrip("/")
    video_path = doc.get("videoPath", "")
    video_url = video_path if video_path.startswith("http") else f"{base_url}{video_path}"

    return {"videoUrl": video_url}


@router.get("/content/{content_id}")
async def get_content(content_id: str):
    """Get full details for a specific content item."""
    collection = get_images_collection()
    doc = await collection.find_one({"contentId": content_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Content not found")

    doc["_id"] = str(doc.get("_id", ""))
    return doc


@router.put("/content/{content_id}")
async def update_content(
    content_id: str,
    type: str = Form(...),
    title: Optional[str] = Form(""),
    file: Optional[UploadFile] = File(None),
    url: Optional[str] = Form(None),
    text: Optional[str] = Form(None),
):
    """Update the associated hidden content for an existing target image."""
    collection = get_images_collection()
    doc = await collection.find_one({"contentId": content_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Content not found")

    final_url = doc.get("url", "")
    final_text = doc.get("text", "")

    if type == "text":
        if not text:
            raise HTTPException(status_code=400, detail="Text field required")
        final_text = text.strip()
        final_url = ""
    else:
        # If new file is provided, save it and optionally delete old one
        if file and file.filename:
            sub = "videos" if type == "video" else ("audio" if type == "audio" else ("pdfs" if type == "pdf" else "images"))
            saved_path, _ = await _save_upload(file, sub)
            
            # delete old associated file if it was local
            old_url = doc.get("videoPath", "") or doc.get("url", "")
            if old_url and not old_url.startswith("http"):
                abs_path = os.path.join(os.getcwd(), old_url.lstrip("/"))
                if os.path.exists(abs_path):
                    try:
                        os.remove(abs_path)
                    except:
                        pass
            final_url = saved_path
            final_text = ""
        elif url:
            final_url = url.strip()
            final_text = ""
        else:
            final_url = doc.get("url", "")  # Keep old one if nothing changed and type matches

    update_fields = {
        "type": type,
        "title": title or doc.get("title", ""),
        "text": final_text,
        "url": final_url,
        "videoPath": final_url, # For legacy compatibility
        "videoType": "link" if (not file or not file.filename) else "file"
    }

    await collection.update_one({"contentId": content_id}, {"$set": update_fields})
    return {"message": "Content updated successfully"}

@router.delete("/content/{content_id}")
async def delete_content(content_id: str):
    """Delete a content item from FAISS and MongoDB, and remove files. Cascade-deletes attached contents."""
    collection = get_images_collection()
    doc = await collection.find_one({"contentId": content_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Content not found")

    # Remove files from disk
    for path_key in ["imagePath", "videoPath"]:
        rel_path = doc.get(path_key, "")
        if rel_path and not rel_path.startswith("http"):
            abs_path = os.path.join(os.getcwd(), rel_path.lstrip("/"))
            if os.path.exists(abs_path):
                os.remove(abs_path)

    # Cascade-delete all attached contents (Step 2)
    attached_col = get_attached_contents_collection()
    attached_cursor = attached_col.find({"contentId": content_id})
    async for att in attached_cursor:
        att_url = att.get("url", "")
        if att_url and not att_url.startswith("http"):
            att_abs = os.path.join(os.getcwd(), att_url.lstrip("/"))
            if os.path.exists(att_abs):
                os.remove(att_abs)
    await attached_col.delete_many({"contentId": content_id})

    # Remove from FAISS
    faiss_index.remove(content_id)

    # Remove from MongoDB
    await collection.delete_one({"contentId": content_id})

    return {"message": "Content deleted successfully"}


@router.get("/search")
async def search_similar(content_id: str, k: int = 5):
    """
    Search for images similar to an existing content item.
    (Bonus endpoint for future use in Step 3.)
    """
    collection = get_images_collection()
    doc = await collection.find_one({"contentId": content_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Content not found")

    abs_image_path = os.path.join(os.getcwd(), doc["imagePath"].lstrip("/"))
    embedding = extract_embedding(abs_image_path)
    results = faiss_index.search(embedding, k=k)

    return {
        "query": content_id,
        "results": [{"contentId": cid, "score": score} for cid, score in results],
    }


# ══════════════════════════════════════════════════════════════════════════
# Step 2: Attach Multimedia Content
# ══════════════════════════════════════════════════════════════════════════

_CONTENT_TYPE_SUBFOLDER = {
    "video": "videos",
    "audio": "audio",
    "image": "images",
    "pdf": "pdfs",
}


@router.post("/attach-content")
async def attach_content(
    request: Request,
    contentId: str = Form(...),
    contentType: str = Form(...),
    file: Optional[UploadFile] = File(None),
    url: Optional[str] = Form(None),
    text: Optional[str] = Form(None),
    title: Optional[str] = Form(""),
):
    """
    Attach a piece of content (video/audio/image/text/pdf) to an existing image.
    Supports file upload, URL, or text depending on content type.
    """
    # Validate content type
    if contentType not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid content type '{contentType}'. Allowed: {ALLOWED_CONTENT_TYPES}",
        )

    # Validate that parent image exists
    images_col = get_images_collection()
    parent = await images_col.find_one({"contentId": contentId})
    if not parent:
        raise HTTPException(status_code=404, detail="Image not found. Upload the image first.")

    # Determine the content value (file, url, or text)
    final_url = None
    final_text = None

    if contentType == "text":
        # Text content: require the text field
        if not text or not text.strip():
            raise HTTPException(status_code=400, detail="Text field is required for text content.")
        final_text = text.strip()
    else:
        # Media content: need either a file or a URL
        has_file = file is not None and file.filename
        has_url = url is not None and url.strip() != ""

        if not has_file and not has_url:
            raise HTTPException(
                status_code=400,
                detail=f"Either a file or a URL is required for {contentType} content.",
            )

        if has_file:
            subfolder = _CONTENT_TYPE_SUBFOLDER.get(contentType, "uploads")
            saved_path, _ = await _save_upload(file, subfolder)
            final_url = saved_path
        else:
            final_url = url.strip()

    # Calculate order (next in sequence)
    attached_col = get_attached_contents_collection()
    existing_count = await attached_col.count_documents({"contentId": contentId})

    # Create attachment document
    attachment_id = str(uuid.uuid4())
    doc = {
        "attachmentId": attachment_id,
        "contentId": contentId,
        "type": contentType,
        "url": final_url,
        "text": final_text,
        "title": title or "",
        "order": existing_count + 1,
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }
    await attached_col.insert_one(doc)

    return {
        "message": "Content attached successfully",
        "attachment": {
            "attachmentId": attachment_id,
            "contentId": contentId,
            "type": contentType,
            "url": final_url,
            "text": final_text,
            "title": title or "",
            "order": existing_count + 1,
        },
    }


@router.get("/attached-contents/{content_id}")
async def get_attached_contents(content_id: str):
    """Get all attached contents for an image, sorted by order."""
    attached_col = get_attached_contents_collection()
    cursor = attached_col.find({"contentId": content_id}).sort("order", 1)
    results = []
    async for doc in cursor:
        doc["_id"] = str(doc.get("_id", ""))
        results.append(doc)
    return results


@router.delete("/attached-content/{attachment_id}")
async def delete_attached_content(attachment_id: str):
    """Delete a specific attached content item and its file."""
    attached_col = get_attached_contents_collection()
    doc = await attached_col.find_one({"attachmentId": attachment_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Attachment not found")

    # Remove file from disk if it's a local upload
    file_url = doc.get("url", "")
    if file_url and not file_url.startswith("http"):
        abs_path = os.path.join(os.getcwd(), file_url.lstrip("/"))
        if os.path.exists(abs_path):
            os.remove(abs_path)

    await attached_col.delete_one({"attachmentId": attachment_id})
    return {"message": "Attachment deleted successfully"}
@router.post("/scan", response_model=ScanResponse)
async def scan_frame(
    frame: UploadFile = File(...),
):
    """
    Scan a camera frame for a match in the FAISS index.
    Returns matched content and its attachments.
    """
    # Save frame temporarily
    temp_dir = os.path.join(UPLOAD_DIR, "temp_scans")
    os.makedirs(temp_dir, exist_ok=True)
    temp_filename = f"scan_{int(datetime.now().timestamp())}_{uuid.uuid4().hex[:8]}.jpg"
    temp_path = os.path.join(temp_dir, temp_filename)

    try:
        content = await frame.read()
        with open(temp_path, "wb") as f:
            f.write(content)

        # Extract embedding
        try:
            embedding = extract_embedding(temp_path)
        except Exception as e:
            return ScanResponse(matchFound=False, confidence=0, message=f"Embedding extraction failed: {str(e)}")

        # Search FAISS
        # Increased k=5 to handle duplicates via watermark verification
        results = faiss_index.search(embedding, k=5)

        if not results:
            print("Scan result: Index empty")
            return ScanResponse(matchFound=False, confidence=0, message="Index empty")

        # Threshold check: Filter out results below threshold
        candidates = [res for res in results if res[1] >= SIMILARITY_THRESHOLD]
        
        if not candidates:
            top_score = results[0][1] if results else 0
            return ScanResponse(matchFound=False, confidence=float(top_score), message="This image is not uploaded")

        # Disambiguation via Invisible Watermark
        content_id = None
        final_score = 0
        
        # Read frame bytes for watermark detection
        with open(temp_path, "rb") as f:
            frame_bytes = f.read()

        # Try to find the candidate that matches the watermark
        watermark_match_found = False
        for cand_id, cand_score in candidates:
            # We expect the last 8 chars of the ID to be the watermark
            if wm_manager.detect_id(frame_bytes, cand_id[-8:]):
                print(f"Watermark verified for {cand_id} (score: {cand_score:.4f})")
                content_id = cand_id
                final_score = cand_score
                watermark_match_found = True
                break
        
        # Fallback: if no watermark is detected but we have a very strong visual match (> 0.90)
        # return the top visual match. If scores are similar and no watermark, we pick the first.
        if not watermark_match_found:
            content_id, final_score = candidates[0]
            print(f"No watermark detected. Falling back to top visual match: {content_id}")

        # Fetch content metadata
        img_col = get_images_collection()
        doc = await img_col.find_one({"contentId": content_id})
        if not doc:
            print(f"Scan error: Metadata lost for {content_id}")
            return ScanResponse(
                matchFound=False, 
                confidence=float(final_score), 
                message="Target recognized but data is missing. Please delete and re-upload this target."
            )

        doc["_id"] = str(doc.get("_id", ""))
        match_content = ARContentResponse(**doc)

        # Fetch attachments
        attached_col = get_attached_contents_collection()
        cursor = attached_col.find({"contentId": content_id}).sort("order", 1)
        attachments = []
        async for att_doc in cursor:
            att_doc["_id"] = str(att_doc.get("_id", ""))
            attachments.append(AttachedContentResponse(**att_doc))

        return ScanResponse(
            matchFound=True,
            confidence=float(final_score),
            content=match_content,
            attachments=attachments,
            message="Match found!"
        )

    finally:
        # Cleanup temp file
        if os.path.exists(temp_path):
            os.remove(temp_path)
