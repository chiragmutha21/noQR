import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

async def list_data():
    uri = os.getenv("MONGO_URI")
    client = AsyncIOMotorClient(uri, tlsAllowInvalidCertificates=True)
    db = client.get_default_database()
    col = db["contents"]
    
    print(f"Checking collection: contents in db: {db.name}")
    async for doc in col.find({}).sort("createdAt", -1):
        print(f"ID: {doc.get('contentId')}")
        print(f"Image: {doc.get('originalImageName')}")
        print(f"Path: {doc.get('imagePath')}")
        print("-" * 20)

if __name__ == "__main__":
    asyncio.run(list_data())
