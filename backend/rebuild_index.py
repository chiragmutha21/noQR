import os
import asyncio
import shutil
from database import get_images_collection, connect_db, disconnect_db
from embeddings import extract_embedding
from faiss_index import FaissIndex
from dotenv import load_dotenv

load_dotenv()

async def rebuild():
    print("Starting FAISS index rebuild from MongoDB metadata...")
    
    # Paths
    FAISS_INDEX_PATH = "data/faiss_index.bin"
    FAISS_MAPPING_PATH = "data/id_mapping.json"
    
    # 1. Clean up old indexes to start fresh
    for path in [FAISS_INDEX_PATH, FAISS_MAPPING_PATH]:
        if os.path.exists(path):
            try:
                os.remove(path)
                print(f"Removed old index file: {path}")
            except Exception as e:
                print(f"Warning: Could not remove {path}: {e}")

    # 2. Create fresh index instance
    new_index = FaissIndex(FAISS_INDEX_PATH, FAISS_MAPPING_PATH)
    
    # 3. Connect to DB
    await connect_db()
    coll = get_images_collection()
    
    if coll is None:
        print("Error: Could not connect to MongoDB.")
        return

    # 4. Iterate over MongoDB records
    cursor = coll.find({})
    count = 0
    errors = 0
    
    async for doc in cursor:
        content_id = doc["contentId"]
        image_path = doc["imagePath"]
        # Convert relative to absolute
        abs_path = os.path.join(os.getcwd(), image_path.lstrip("/"))
        
        if not os.path.exists(abs_path):
            print(f"  [Error] Image file missing for {content_id}: {abs_path}")
            errors += 1
            continue
            
        try:
            print(f"  [+] Indexing {content_id} ({doc.get('originalImageName', 'unknown')})...")
            embedding = extract_embedding(abs_path)
            new_index.add(embedding, content_id)
            count += 1
        except Exception as e:
            print(f"  [Error] Failed to index {content_id}: {e}")
            errors += 1

    print(f"\nRebuild Finished!")
    print(f"Successfully Indexed: {count}")
    print(f"Failed/Missing: {errors}")
    
    await disconnect_db()

if __name__ == "__main__":
    asyncio.run(rebuild())
