from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import auth, gmao
from app.db.session import engine, Base, SessionLocal
from app.models.models import User, Machine, Stock
from app.core.security import get_password_hash

# Initialize Database
Base.metadata.create_all(bind=engine)

app = FastAPI(title="GMAO PRO API", version="1.1.0")

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def seed_data():
    db = SessionLocal()
    if db.query(User).count() == 0:
        # Seeding with Emails for the new auth system
        db.add_all([
            User(username="admin", email="admin@gmao-pro.com", password_hash=get_password_hash("admin123"), role="admin", name="Admin Principal"),
            User(username="manager", email="manager@gmao-pro.com", password_hash=get_password_hash("mgr123"), role="manager", name="Chef Maintenance"),
            User(username="tech1", email="tech1@gmao-pro.com", password_hash=get_password_hash("tech123"), role="technician", name="Technicien #1"),
        ])
        db.add_all([
            Machine(name="Compresseur A1", reference="COMP-001", location="Atelier Nord", status="operational", health_score=85),
            Machine(name="Tour CN-200", reference="TCN-200", location="Atelier Sud", status="maintenance", health_score=60),
            Machine(name="Convoyeur B3", reference="CONV-003", location="Ligne B", status="operational", health_score=92),
            Machine(name="Presse Hydraulique P5", reference="PH-005", location="Atelier Est", status="breakdown", health_score=15),
        ])
        db.add_all([
            Stock(name="Filtre à huile", reference="FH-100", quantity=12, min_quantity=5, unit="unité"),
        ])
        db.commit()
    db.close()

# Include Routers
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(gmao.router, prefix="/api", tags=["gmao"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=4000)
