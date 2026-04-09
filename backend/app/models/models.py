from sqlalchemy import Column, Integer, String, Float, Text, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.db.session import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False)
    name = Column(String)
    manager_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    team = Column(String, nullable=True)

class Machine(Base):
    __tablename__ = "machines"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    reference = Column(String)
    location = Column(String)
    status = Column(String)
    health_score = Column(Integer)
    last_maintenance_date = Column(String)
    next_maintenance_date = Column(String)
    maintenance_frequency_days = Column(Integer, default=90)

class WorkOrder(Base):
    __tablename__ = "work_orders"
    id = Column(Integer, primary_key=True, index=True)
    sap_order_id = Column(String)
    title = Column(String)
    description = Column(Text)
    type = Column(String)
    priority = Column(String)
    status = Column(String)
    technical_location = Column(String)
    equipment_id = Column(String)
    serial_number = Column(String)
    team = Column(String)
    responsible_person = Column(String)
    technician_id = Column(Integer)
    planned_start_date = Column(String)
    planned_end_date = Column(String)
    actual_start_date = Column(String)
    actual_end_date = Column(String)
    time_spent = Column(Float)
    work_log = Column(Text)
    failure_cause = Column(Text)
    solution_applied = Column(Text)
    comments = Column(Text)
    created_by = Column(Integer)
    created_at = Column(String)
    
    parts = relationship("WorkOrderPart", back_populates="work_order")
    steps = relationship("WorkOrderStep", back_populates="work_order")

class WorkOrderStep(Base):
    __tablename__ = "work_order_steps"
    id = Column(Integer, primary_key=True, index=True)
    work_order_id = Column(Integer, ForeignKey("work_orders.id"))
    description = Column(String)
    is_done = Column(Boolean, default=False)
    order_index = Column(Integer, default=0)
    
    work_order = relationship("WorkOrder", back_populates="steps")

class WorkOrderPart(Base):
    __tablename__ = "work_order_parts"
    id = Column(Integer, primary_key=True, index=True)
    work_order_id = Column(Integer, ForeignKey("work_orders.id"))
    part_code = Column(String)
    part_name = Column(String)
    quantity = Column(Integer)
    deducted = Column(Boolean, default=False)
    unit_price_at_consumption = Column(Float, default=0.0)
    
    work_order = relationship("WorkOrder", back_populates="parts")

class Stock(Base):
    __tablename__ = "stock_items"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    reference = Column(String)
    quantity = Column(Integer)
    unit = Column(String)
    location = Column(String)
    image = Column(String)
    synonyms = Column(String)
    unit_price = Column(Float, default=0.0)

class PartsRequest(Base):
    __tablename__ = "parts_requests"
    id = Column(Integer, primary_key=True, index=True)
    work_order_id = Column(Integer, ForeignKey("work_orders.id"))
    requested_by = Column(Integer, ForeignKey("users.id"))
    status = Column(String, default="pending")  # pending / approved / rejected
    rejection_reason = Column(Text, nullable=True)
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(String)
    approved_at = Column(String, nullable=True)

    items = relationship("PartsRequestItem", back_populates="request")
    work_order = relationship("WorkOrder")

class PartsRequestItem(Base):
    __tablename__ = "parts_request_items"
    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey("parts_requests.id"))
    part_code = Column(String)
    part_name = Column(String)
    quantity_requested = Column(Integer)
    quantity_approved = Column(Integer, nullable=True)

    request = relationship("PartsRequest", back_populates="items")

class StockMovement(Base):
    __tablename__ = "stock_movements"
    id = Column(Integer, primary_key=True, index=True)
    part_code = Column(String)
    part_name = Column(String)
    quantity = Column(Integer)
    type = Column(String) # IN / OUT
    date = Column(String)
    user_id = Column(Integer, ForeignKey("users.id"))
    work_order_id = Column(Integer, ForeignKey("work_orders.id"), nullable=True)
    request_id = Column(Integer, ForeignKey("parts_requests.id"), nullable=True)
    
    user = relationship("User")

class WorkSession(Base):
    __tablename__ = "work_sessions"
    id = Column(Integer, primary_key=True, index=True)
    work_order_id = Column(Integer, ForeignKey("work_orders.id"))
    technician_id = Column(Integer, ForeignKey("users.id"))
    start_time = Column(String) # ISO 8601
    end_time = Column(String, nullable=True)
    duration = Column(Float, default=0.0) # Duration in hours or minutes
    is_synced = Column(Boolean, default=True)
    
    work_order = relationship("WorkOrder")
    technician = relationship("User")

