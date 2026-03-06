import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

async def get_doc():
    uri = os.getenv("MONGO_URI")
    client = AsyncIOMotorClient(uri)
    db = client.get_default_database()
    col = db["contents"]
    
    doc = await col.find_one({"contentId": "35e179b7-7e20-49d2-97a0-f17bb2f50ab5"})
    print(f"Doc: {doc}")

if __name__ == "__main__":
    asyncio.run(get_doc())
