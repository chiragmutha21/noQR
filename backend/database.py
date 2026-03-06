"""
MongoDB connection using Motor (async driver).
Includes a local JSON fallback if MongoDB is unreachable.
"""
import os
import json
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/ar_db")
LOCAL_DB_PATH = "data/metadata_backup.json"

client: AsyncIOMotorClient = None
db = None
_is_mock = False

async def connect_db():
    global client, db, _is_mock
    try:
        client = AsyncIOMotorClient(
            MONGO_URI,
            tlsAllowInvalidCertificates=True,
            serverSelectionTimeoutMS=2000,
            connectTimeoutMS=2000
        )
        await client.admin.command('ping')
        db = client.get_default_database()
        if db is None: db = client["ar_db"]
        _is_mock = False
        print(f"MongoDB connected: {db.name}")
    except Exception as e:
        print(f"MongoDB fallback mode active: {e}")
        db = None
        _is_mock = True
        if not os.path.exists(LOCAL_DB_PATH):
            os.makedirs("data", exist_ok=True)
            with open(LOCAL_DB_PATH, "w") as f:
                json.dump({"contents": [], "attached_contents": []}, f)

async def disconnect_db():
    global client
    if client: client.close()

class MockCollection:
    def __init__(self, key): self.key = key
    def _load(self):
        try:
            with open(LOCAL_DB_PATH, "r") as f: return json.load(f).get(self.key, [])
        except: return []
    def _save(self, items):
        data = {"contents": [], "attached_contents": []}
        try:
            with open(LOCAL_DB_PATH, "r") as f: data = json.load(f)
        except: pass
        data[self.key] = items
        with open(LOCAL_DB_PATH, "w") as f: json.dump(data, f, indent=2)

    async def insert_one(self, doc):
        print(f"MOCK DB: Inserting into {self.key}")
        items = self._load()
        if "_id" not in doc:
            doc["_id"] = f"mock_{self.key}_{len(items)}"
        items.append(doc)
        self._save(items)
        return doc
    def find(self, query=None):
        items = self._load()
        if query: items = [i for i in items if all(i.get(k) == v for k, v in query.items())]
        class AsyncIter:
            def __init__(self, d): self.d = d; self.i = 0
            def sort(self, k, dir): self.d.sort(key=lambda x: x.get(k, ""), reverse=(dir == -1)); return self
            def __aiter__(self): return self
            async def __anext__(self):
                if self.i >= len(self.d): raise StopAsyncIteration
                val = self.d[self.i]; self.i += 1; return val
        return AsyncIter(items)
    async def find_one(self, query):
        items = self._load()
        for i in items:
            if all(i.get(k) == v for k, v in query.items()): return i
        return None
    async def update_one(self, query, update):
        items = self._load()
        modified_count = 0
        for i in items:
            if all(i.get(k) == v for k, v in query.items()):
                # Simple implementation of $inc for analytics
                if "$inc" in update:
                    for key, val in update["$inc"].items():
                        parts = key.split('.')
                        curr = i
                        for part in parts[:-1]:
                            if part not in curr or not isinstance(curr[part], dict): curr[part] = {}
                            curr = curr[part]
                        curr[parts[-1]] = curr.get(parts[-1], 0) + val
                if "$set" in update:
                    for key, val in update["$set"].items():
                        parts = key.split('.')
                        curr = i
                        for part in parts[:-1]:
                            if part not in curr or not isinstance(curr[part], dict): curr[part] = {}
                            curr = curr[part]
                        curr[parts[-1]] = val
                self._save(items)
                modified_count = 1
                break
        
        class Result:
            def __init__(self, count): self.modified_count = count
        return Result(modified_count)
    async def delete_one(self, query):
        items = self._load(); new = [i for i in items if not all(i.get(k) == v for k, v in query.items())]
        self._save(new); return len(items) != len(new)
    async def delete_many(self, query):
        items = self._load(); new = [i for i in items if not all(i.get(k) == v for k, v in query.items())]
        self._save(new); return len(items) - len(new)
    async def count_documents(self, query):
        items = self._load(); return len([i for i in items if all(i.get(k) == v for k, v in query.items())])

def get_images_collection():
    if _is_mock:
        print("Using MOCK images collection")
        return MockCollection("contents")
    print("Using REAL images collection")
    return db["contents"] if db is not None else None

def get_attached_contents_collection():
    if _is_mock:
        print("Using MOCK attached_contents collection")
        return MockCollection("attached_contents")
    print("Using REAL attached_contents collection")
    return db["attached_contents"] if db is not None else None
