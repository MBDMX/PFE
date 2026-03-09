import os
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from jose import jwt
from passlib.context import CryptContext
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, Integer, String, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from dotenv import load_dotenv

load_dotenv()

# --- CONFIG ---
SECRET_KEY = os.getenv("SECRET_KEY", "secret")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 480))
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./gmao.db")

# --- DATABASE ---
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- MODELS (SQLAlchemy) ---
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True)
    password_hash = Column(String)
    role = Column(String)
    name = Column(String)

class Machine(Base):
    __tablename__ = "machines"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    reference = Column(String)
    location = Column(String)
    status = Column(String)
    health_score = Column(Integer)

class WorkOrder(Base):
    __tablename__ = "work_orders"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    machine_id = Column(Integer, ForeignKey("machines.id"))
    assigned_to = Column(Integer, ForeignKey("users.id"))
    priority = Column(String)
    status = Column(String)
    due_date = Column(String)

class Stock(Base):
    __tablename__ = "stock"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    reference = Column(String)
    quantity = Column(Integer)
    min_quantity = Column(Integer)
    unit = Column(String)

Base.metadata.create_all(bind=engine)

# --- SCHEMAS (Pydantic) ---
class UserLogin(BaseModel):
    username: str
    password: str
    role: str

class Token(BaseModel):
    token: str
    user: dict

class MachineIn(BaseModel):
    name: str; reference: str; location: str; status: str; health_score: int
class MachineOut(MachineIn):
    id: int
    class Config: from_attributes = True

class WorkOrderIn(BaseModel):
    title: str; machine_id: int; assigned_to: int; priority: str; status: str; due_date: str
class WorkOrderOut(WorkOrderIn):
    id: int
    class Config: from_attributes = True

class StockIn(BaseModel):
    name: str; reference: str; quantity: int; min_quantity: int; unit: str
class StockOut(StockIn):
    id: int
    class Config: from_attributes = True

# --- APP ---
app = FastAPI(title="GMAO PRO API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# --- AUTH UTILS ---
def get_password_hash(password): return pwd_context.hash(password)
def verify_password(plain, hashed): return pwd_context.verify(plain, hashed)
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# --- STARTUP (Seed) ---
@app.on_event("startup")
def seed():
    db = SessionLocal()
    if db.query(User).count() == 0:
        db.add_all([
            User(username="admin", password_hash=get_password_hash("admin123"), role="admin", name="Admin Principal"),
            User(username="manager", password_hash=get_password_hash("mgr123"), role="manager", name="Chef Maintenance"),
            User(username="tech1", password_hash=get_password_hash("tech123"), role="technician", name="Technicien #1"),
        ])
        db.add_all([
            Machine(name="Compresseur A1", reference="COMP-001", location="Atelier Nord", status="operational", health_score=85),
            Machine(name="Tour CN-200", reference="TCN-200", location="Atelier Sud", status="maintenance", health_score=60),
            Machine(name="Convoyeur B3", reference="CONV-003", location="Ligne B", status="operational", health_score=92),
            Machine(name="Presse Hydraulique P5", reference="PH-005", location="Atelier Est", status="breakdown", health_score=15),
        ])
        db.add_all([
            Stock(name="Filtre à huile", reference="FH-100", quantity=12, min_quantity=5, unit="unité"),
            Stock(name="Courroie trapézoïdale", reference="CT-205", quantity=3, min_quantity=5, unit="unité"),
        ])
        db.commit()
    db.close()

# --- ROUTES ---
@app.post("/api/auth/login", response_model=Token)
def login(u: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == u.username, User.role == u.role).first()
    if not user or not verify_password(u.password, user.password_hash):
        raise HTTPException(401, "Invalide")
    return {"token": create_access_token({"sub": user.username}), "user": {"id": user.id, "username": user.username, "role": user.role, "name": user.name}}

# CRUD Generic (Concept shortcuts for brevity as requested)
@app.get("/api/machines", response_model=List[MachineOut])
def get_m(db: Session = Depends(get_db)): return db.query(Machine).all()

@app.get("/api/work-orders", response_model=List[WorkOrderOut])
def get_wo(db: Session = Depends(get_db)): return db.query(WorkOrder).all()

@app.get("/api/stock", response_model=List[StockOut])
def get_s(db: Session = Depends(get_db)): return db.query(Stock).all()

@app.get("/api/stats")
def get_stats(db: Session = Depends(get_db)):
    return {
        "totalMachines": db.query(Machine).count(),
        "operational": db.query(Machine).filter(Machine.status == "operational").count(),
        "openOrders": db.query(WorkOrder).filter(WorkOrder.status != "done").count(),
        "lowStock": db.query(Stock).filter(Stock.quantity <= Stock.min_quantity).count(),
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=4000)
