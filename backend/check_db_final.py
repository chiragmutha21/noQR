import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

async def check_db():
    uri = os.getenv("MONGO_URI")
    client = AsyncIOMotorClient(uri)
    db = client.get_default_database()
    print(f"Connecting to DB: {db.name}")
    
    col = db["contents"]
    count = await col.count_documents({})
    print(f"Collection 'contents' count: {count}")
    
    async for doc in col.find({}):
        print(f"Found doc with email: {doc.get('user_email')}")

if __name__ == "__main__":
    asyncio.run(check_db())
