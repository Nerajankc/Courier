from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from backend.routers import users, search, couriers, tracking
from backend.database import init_db
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

app = FastAPI(title="Courier Finder API", version="1.0.0")

# CORS settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded images
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Initialize database
@app.on_event("startup")
async def startup_event():
    init_db()

# Routers
app.include_router(users.router, prefix="/users", tags=["Users"])
app.include_router(search.router, prefix="/requests", tags=["Search"])
app.include_router(couriers.router, prefix="/couriers", tags=["Couriers"])
app.include_router(tracking.router, prefix="/tracking", tags=["Tracking"])

@app.get("/")
def read_root():
    return {"message": "Welcome to the Courier Finder API", "docs": "/docs"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}
