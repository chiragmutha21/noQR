import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

async def fix_emails():
    uri = os.getenv("MONGO_URI")
    client = AsyncIOMotorClient(uri, tlsAllowInvalidCertificates=True)
    try:
        db = client.get_default_database()
        coll = db["contents"]
        
        # Update records with no email
        result = await coll.update_many(
            {"user_email": {"$in": [None, ""]}},
            {"$set": {"user_email": "chiragmutha31@gmail.com"}}
        )
        print(f"Updated {result.modified_count} records to user 'chiragmutha31@gmail.com'")
        
        # Also fix any paths that might be absolute to the disk but should be relative to URL
        # All paths seem to start with /uploads already.
        
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(fix_emails())
