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
    
    # Database is handled here, but cleanup is disabled for safety.
    print("Server ready.")
    yield
    await disconnect_db()

app = FastAPI(
    title="AR Image Recognition System",
    version="1.1.0",
    lifespan=lifespan,
)

import socket

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except:
        return "127.0.0.1"

local_ip = get_local_ip()
print(f"Dynamic CORS active for: {local_ip}")

# CORS — includes Capacitor mobile origins + web dev origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost",
        "capacitor://localhost",
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        f"http://{local_ip}:3000",
        f"http://{local_ip}:3001",
        f"http://{local_ip}.nip.io:3000",
        f"http://{local_ip}.nip.io:3001",
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


# Use absolute path for static files to avoid issues with working directory
abs_upload_dir = os.path.join(os.getcwd(), UPLOAD_DIR)
app.mount("/uploads", StaticFiles(directory=abs_upload_dir), name="uploads")

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
