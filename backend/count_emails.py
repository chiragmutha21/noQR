import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

async def count_by_email():
    uri = os.getenv("MONGO_URI")
    client = AsyncIOMotorClient(uri)
    db = client.get_default_database()
    col = db["contents"]
    
    pipeline = [
        {"$group": {"_id": "$user_email", "count": {"$sum": 1}}}
    ]
    async for res in col.aggregate(pipeline):
        print(res)

if __name__ == "__main__":
    asyncio.run(count_by_email())
