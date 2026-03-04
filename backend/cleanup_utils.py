import os
import asyncio
from database import get_images_collection, get_attached_contents_collection

async def cleanup_orphaned_files():
    """Scan uploads directory and remove files not referenced in MongoDB or the mock JSON."""
    collection = get_images_collection()
    attached_col = get_attached_contents_collection()
    
    if collection is None:
        print("Cleanup: Database not connected. Skipping.")
        return

    # 1. Get all referenced paths from MongoDB
    referenced_paths = set()
    try:
        async for doc in collection.find({}, {"imagePath": 1, "videoPath": 1, "url": 1}):
            for key in ["imagePath", "videoPath", "url"]:
                path = doc.get(key)
                if path and isinstance(path, str) and not path.startswith("http"):
                    # Normalize: strip leading slash and handle slash type
                    clean_path = path.lstrip("/").replace("\\", "/")
                    referenced_paths.add(clean_path)
                    
        async for doc in attached_col.find({}, {"url": 1}):
            path = doc.get("url")
            if path and isinstance(path, str) and not path.startswith("http"):
                clean_path = path.lstrip("/").replace("\\", "/")
                referenced_paths.add(clean_path)
    except Exception as e:
        print(f"Cleanup: Error fetching from DB: {e}")
        return

    # 2. Walk through uploads directory
    uploads_root = os.getenv("UPLOAD_DIR", "uploads")
    if not os.path.exists(uploads_root):
        print(f"Cleanup: Upload directory '{uploads_root}' not found.")
        return

    print(f"Cleanup: Scanning '{uploads_root}' against {len(referenced_paths)} database records...")
    
    deleted_count = 0
    # Use lowercase for case-insensitive check on Windows if needed, but here we stay strict
    cwd = os.getcwd()
    
    for root, dirs, files in os.walk(uploads_root):
        # Skip temp scans
        if "temp_scans" in root:
            continue
            
        for file in files:
            full_path = os.path.join(root, file)
            # Get path relative to the backend root (cwd)
            try:
                rel_path = os.path.relpath(full_path, cwd).replace("\\", "/")
                
                if rel_path not in referenced_paths:
                    print(f"Cleanup: Removing orphaned file -> {rel_path}")
                    try:
                        os.remove(full_path)
                        deleted_count += 1
                    except Exception as e:
                        print(f"Cleanup: Failed to delete {rel_path}: {e}")
            except ValueError:
                continue

    if deleted_count > 0:
        print(f"Cleanup finished. Deleted {deleted_count} orphaned files.")
    else:
        print("Cleanup finished. No orphaned files found.")

async def start_periodic_cleanup(interval_seconds=3600):
    """Background loop for periodic cleanup."""
    while True:
        await asyncio.sleep(interval_seconds)
        try:
            await cleanup_orphaned_files()
        except Exception as e:
            print(f"Cleanup Loop Error: {e}")
