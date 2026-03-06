import asyncio
import os
import shutil
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

async def wipe_all():
    # 1. Clear MongoDB
    uri = os.getenv("MONGO_URI")
    if uri:
        client = AsyncIOMotorClient(uri)
        db = client.get_default_database()
        print(f"Wiping database: {db.name}")
        await db["contents"].delete_many({})
        await db["attached_contents"].delete_many({})
        print("MongoDB collections cleared.")
    
    # 2. Clear Uploads
    upload_dir = os.getenv("UPLOAD_DIR", "uploads")
    for sub in ["images", "videos", "audio", "pdfs", "temp_scans"]:
        dir_path = os.path.join(upload_dir, sub)
        if os.path.exists(dir_path):
            shutil.rmtree(dir_path)
            os.makedirs(dir_path, exist_ok=True)
            print(f"Cleared directory: {dir_path}")

    # 3. Clear FAISS Index
    faiss_bin = os.getenv("FAISS_INDEX_PATH", "data/faiss_index.bin")
    faiss_map = os.getenv("FAISS_MAPPING_PATH", "data/id_mapping.json")
    for f in [faiss_bin, faiss_map]:
        if os.path.exists(f):
            os.remove(f)
            print(f"Deleted file: {f}")

if __name__ == "__main__":
    asyncio.run(wipe_all())
