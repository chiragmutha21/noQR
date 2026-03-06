import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

async def list_data():
    uri = os.getenv("MONGO_URI")
    client = AsyncIOMotorClient(uri)
    db = client.get_default_database()
    col = db["contents"]
    
    print(f"Checking collection: contents in db: {db.name}")
    async for doc in col.find({}):
        print(f"ID: {doc.get('contentId')}, Email: {doc.get('user_email')}, Image: {doc.get('originalImageName')}")

if __name__ == "__main__":
    asyncio.run(list_data())
