import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

async def list_contents():
    uri = os.getenv("MONGO_URI")
    client = AsyncIOMotorClient(uri, tlsAllowInvalidCertificates=True)
    try:
        db = client.get_default_database()
        coll = db["contents"]
        async for doc in coll.find({}):
            print(f"ID: {doc.get('contentId', 'N/A')}")
            print(f"Name: {doc.get('originalImageName', 'N/A')}")
            print(f"Path: {doc.get('imagePath', 'N/A')}")
            print("-" * 20)
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(list_contents())
