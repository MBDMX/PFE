from pydantic import BaseModel, ConfigDict, EmailStr, Field
from typing import List, Optional

class UserLogin(BaseModel):
    identifier: str = Field(..., description="Username or Email")
    password: str

class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, pattern="^[a-zA-Z0-9_-]+$")
    email: EmailStr
    password: str = Field(..., min_length=8)
    role: str
    name: str

class UserOut(BaseModel):
    id: int
    username: str
    email: str
    role: str
    name: str
    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserOut

class TokenRefreshRequest(BaseModel):
    refresh_token: str

class MachineBase(BaseModel):
    name: str; reference: str; location: str; status: str; health_score: int
    last_maintenance_date: Optional[str] = None
    next_maintenance_date: Optional[str] = None

class Machine(MachineBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class StockBase(BaseModel):
    name: str; reference: str; quantity: int; unit: str; location: str; image: Optional[str] = None; synonyms: Optional[str] = None

class Stock(StockBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class WorkOrderPart(BaseModel):
    id: int
    work_order_id: int
    part_code: str
    part_name: str
    quantity: int
    model_config = ConfigDict(from_attributes=True)

class WorkOrder(BaseModel):
    id: int
    sap_order_id: Optional[str] = None
    title: str
    description: Optional[str] = None
    type: str
    priority: str
    status: str
    technical_location: Optional[str] = None
    equipment_id: Optional[str] = None
    serial_number: Optional[str] = None
    team: Optional[str] = None
    responsible_person: Optional[str] = None
    technician_id: Optional[int] = None
    planned_start_date: Optional[str] = None
    planned_end_date: Optional[str] = None
    actual_start_date: Optional[str] = None
    actual_end_date: Optional[str] = None
    time_spent: Optional[float] = None
    work_log: Optional[str] = None
    failure_cause: Optional[str] = None
    solution_applied: Optional[str] = None
    comments: Optional[str] = None
    created_by: Optional[int] = None
    
    parts: Optional[List[WorkOrderPart]] = []
    
    model_config = ConfigDict(from_attributes=True)

class Stats(BaseModel):
    totalMachines: int
    operational: int
    openOrders: int
    lowStock: int
    totalTechnicians: int

class ManagerStats(BaseModel):
    totalOT: int
    openOT: int
    inProgressOT: int
    doneOT: int
    overdueOT: int
    criticalOT: int
    lowStock: int
    avgMachineHealth: int
    resolutionRate: int
    dueMaintenance: int # Alerts for maintenance due soon
