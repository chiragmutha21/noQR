import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

async def list_all_collections():
    uri = os.getenv("MONGO_URI")
    client = AsyncIOMotorClient(uri)
    db = client.get_default_database()
    
    print(f"Connected to DB: {db.name}")
    collections = await db.list_collection_names()
    print(f"Collections: {collections}")
    
    for coll_name in collections:
        col = db[coll_name]
        count = await col.count_documents({})
        print(f"Collection: {coll_name}, Count: {count}")
        async for doc in col.find({}).limit(5):
            # Print a snippet of the doc
            print(f"  Doc: {str(doc)[:200]}")

if __name__ == "__main__":
    asyncio.run(list_all_collections())
