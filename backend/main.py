from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.routers import users, search, couriers

app = FastAPI()

# CORS settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(users.router, prefix="/users", tags=["Users"])
app.include_router(search.router, prefix="/requests", tags=["Search"])
app.include_router(couriers.router, prefix="/couriers", tags=["Couriers"])

@app.get("/")
def read_root():
    return {"message": "Welcome to the Courier Finder API"}
