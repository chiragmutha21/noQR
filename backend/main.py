"""
FastAPI application entry point for the AR Image Recognition system.
"""
import os
import traceback
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv

import asyncio
from database import connect_db, disconnect_db
from routes import router
from cleanup_utils import cleanup_orphaned_files, start_periodic_cleanup

load_dotenv()

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "uploads")

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Application starting up...")
    await connect_db()
    for sub in ["images", "videos", "audio", "pdfs"]:
        os.makedirs(os.path.join(UPLOAD_DIR, sub), exist_ok=True)
    os.makedirs("data", exist_ok=True)
    
    # Run initial cleanup and schedule periodic one
    asyncio.create_task(cleanup_orphaned_files())
    asyncio.create_task(start_periodic_cleanup(3600)) # once per hour
    
    print("Server ready.")
    yield
    await disconnect_db()

app = FastAPI(
    title="AR Image Recognition System",
    version="1.1.0",
    lifespan=lifespan,
)

# CORS — robust configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://192.168.1.36:3000",
        "http://192.168.1.36:3001",
        "http://192.168.1.36.nip.io:3000",
        "http://192.168.1.36.nip.io:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print(f"GLOBAL ERROR: {str(exc)}")
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"message": "Internal Server Error", "detail": str(exc)},
        headers={
            "Access-Control-Allow-Origin": request.headers.get("origin", "*"),
            "Access-Control-Allow-Credentials": "true",
        }
    )

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

@app.middleware("http")
async def log_requests(request: Request, call_next):
    print(f"Incoming: {request.method} {request.url.path}")
    response = await call_next(request)
    return response

app.include_router(router)

@app.get("/")
async def root():
    return {"name": "AR Image Recognition System", "version": "1.1.0"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 5000))
    # Disabled reload for more stable binding in constrained environments
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
