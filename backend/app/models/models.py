from sqlalchemy import Column, Integer, String
from app.db.session import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False)
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
    machine_id = Column(Integer)
    assigned_to = Column(Integer)
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
