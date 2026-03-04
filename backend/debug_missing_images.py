import asyncio
import os
from database import get_images_collection, connect_db
from motor.motor_asyncio import AsyncIOMotorClient

async def check_db():
    await connect_db()
    collection = get_images_collection()
    if collection is None:
        print("Could not connect to DB")
        return
    
    email = "chiragmutha31@gmail.com"
    print(f"Checking for email: {email}")
    cursor = collection.find({"user_email": email})
    async for doc in cursor:
        img_path = doc.get("imagePath", "")
        # imagePath is typically "/uploads/images/foo.jpg"
        # We need to check relative to the root of the project where 'uploads' is.
        # Currently we are in backend/
        disk_path = img_path.lstrip("/")
        
        # In routes.py, it checks if os.path.exists(disk_path) 
        # Since it runs in backend/, and disk_path is "uploads/images/...", 
        # it checks backend/uploads/images/...
        
        exists = os.path.exists(disk_path)
        print(f"ContentId: {doc.get('contentId')}")
        print(f"  ImageName: {doc.get('originalImageName')}")
        print(f"  Path in DB: {img_path}")
        print(f"  Disk Path: {disk_path}")
        print(f"  Exists on disk (from backend/): {exists}")
        
        if not exists:
            # Maybe the path is missing the leading 'backend/' prefix but we ARE in backend?
            # Wait, if we are in backend/, and we check 'uploads/...', it should work.
            pass

if __name__ == "__main__":
    asyncio.run(check_db())
