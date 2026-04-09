from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import auth, gmao
from app.db.session import engine, Base, SessionLocal
from app.models.models import User, Machine, Stock, WorkOrder, WorkOrderStep, WorkOrderPart, PartsRequest, PartsRequestItem, StockMovement
from app.core.security import get_password_hash

# Initialize Database
Base.metadata.create_all(bind=engine)

app = FastAPI(title="GMAO PRO API", version="1.1.0")

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def seed_data():
    from app.db.seed import execute_seed_data
    db = SessionLocal()
    execute_seed_data(db)
    db.close()

# Include Routers
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(gmao.router, prefix="/api", tags=["gmao"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=4000)
