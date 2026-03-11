
import motor.motor_asyncio
import asyncio
import os
from dotenv import load_dotenv

load_dotenv()

async def dump_db():
    uri = os.getenv("MONGO_URI")
    client = motor.motor_asyncio.AsyncIOMotorClient(uri)
    db = client.shop
    col = db.contents
    
    async for doc in col.find({}):
        print(f"ID: {doc.get('contentId')}")
        print(f"Title: {doc.get('title')}")
        print(f"User: {doc.get('user_email')}")
        print(f"ImagePath: {doc.get('imagePath')}")
        print("-" * 20)

if __name__ == "__main__":
    asyncio.run(dump_db())
