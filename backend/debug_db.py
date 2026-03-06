import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

async def check():
    uri = os.getenv("MONGO_URI")
    client = AsyncIOMotorClient(uri, tlsAllowInvalidCertificates=True)
    try:
        db = client.get_default_database()
        coll = db["contents"]
        print("Listing types in contents collection:")
        async for doc in coll.find():
            cid = doc.get("contentId")
            ctype = doc.get("type", "N/A")
            vpath = doc.get("videoPath", "N/A")
            text = str(doc.get("text"))[:20] if doc.get("text") else "None"
            print(f"ID: {cid}, Type: {ctype}, Path: {vpath}, Text: {text}")
            
        coll_att = db["attached_contents"]
        print("\nListing attached_contents:")
        async for doc in coll_att.find():
            pid = doc.get("contentId")
            ctype = doc.get("type", "N/A")
            url = doc.get("url", "N/A")
            text = str(doc.get("text"))[:20] if doc.get("text") else "None"
            print(f"Parent: {pid}, Type: {ctype}, URL: {url}, Text: {text}")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(check())
