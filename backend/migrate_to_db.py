import asyncio
import json
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

async def migrate():
    # Load mock data
    mock_file = "d:/noQR/backend/data/metadata_backup.json"
    if not os.path.exists(mock_file):
        print("Mock file not found.")
        return

    with open(mock_file, "r") as f:
        data = json.load(f)

    # Database connection
    uri = os.getenv("MONGO_URI")
    client = AsyncIOMotorClient(uri)
    db = client.get_default_database()
    contents_col = db["contents"]
    attached_col = db["attached_contents"]

    print(f"Migrating to: {db.name}")

    # Migrate contents
    for item in data.get("contents", []):
        # Remove mock _id to let MongoDB generate its own
        if "_id" in item:
            del item["_id"]
        
        # Check if already exists in DB
        existing = await contents_col.find_one({"contentId": item["contentId"]})
        if not existing:
            await contents_col.insert_one(item)
            print(f"Migrated content: {item['contentId']} ({item.get('user_email', 'no-email')})")
        else:
            print(f"Skipping (already exists): {item['contentId']}")

    # Migrate attached contents
    for item in data.get("attached_contents", []):
        if "_id" in item:
            del item["_id"]
        existing = await attached_col.find_one({"attachmentId": item.get("attachmentId")})
        if not existing:
            await attached_col.insert_one(item)
            print(f"Migrated attachment: {item.get('attachmentId')}")

    print("Migration finished.")

if __name__ == "__main__":
    asyncio.run(migrate())
