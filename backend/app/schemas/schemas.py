from pydantic import BaseModel, ConfigDict, EmailStr, Field, computed_field
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
    manager_id: Optional[int] = None

class UserOut(BaseModel):
    id: int
    username: str
    email: str
    role: str
    name: str
    manager_id: Optional[int] = None
    team: Optional[str] = None
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
    maintenance_frequency_days: Optional[int] = 90

class Machine(MachineBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class StockBase(BaseModel):
    name: str; reference: str; quantity: int; unit: str; location: str; image: Optional[str] = None; synonyms: Optional[str] = None
    unit_price: Optional[float] = 0.0

class Stock(StockBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class WorkOrderPart(BaseModel):
    id: int
    work_order_id: int
    part_code: str
    part_name: str
    quantity: int
    unit_price_at_consumption: Optional[float] = 0.0
    model_config = ConfigDict(from_attributes=True)

class WorkOrderStep(BaseModel):
    id: int
    work_order_id: int
    description: str
    is_done: bool
    order_index: int
    model_config = ConfigDict(from_attributes=True)

class WorkOrderStepUpdate(BaseModel):
    is_done: bool

class WorkOrder(BaseModel):
    id: int
    sap_order_id: Optional[str] = None
    title: str
    description: Optional[str] = None
    type: Optional[str] = "corrective"
    priority: Optional[str] = "medium"
    status: Optional[str] = "open"
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
    created_at: Optional[str] = None
    
    parts: Optional[List[WorkOrderPart]] = []
    steps: Optional[List[WorkOrderStep]] = []
    
    @computed_field
    def total_parts_cost(self) -> float:
        return round(sum(p.quantity * (getattr(p, 'unit_price_at_consumption', 0.0) or 0.0) for p in self.parts), 2) if self.parts else 0.0
    
    model_config = ConfigDict(from_attributes=True)

class WorkOrderCreate(BaseModel):
    title: str
    description: Optional[str] = None
    type: str = "corrective"
    priority: str = "medium"
    location: Optional[str] = None
    equipmentId: Optional[str] = None
    team: Optional[str] = None
    technicianId: Optional[str] = None # Frontend sends as string from select
    responsiblePerson: Optional[str] = None
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    createdAt: Optional[str] = None
    parts: Optional[List[dict]] = []
    steps: Optional[List[str]] = []


class WorkSessionBase(BaseModel):
    work_order_id: int
    technician_id: int
    start_time: str
    end_time: Optional[str] = None
    duration: Optional[float] = 0.0
    is_synced: Optional[bool] = True

class WorkSessionCreate(WorkSessionBase):
    pass

class WorkSession(WorkSessionBase):
    id: int
    work_order_title: Optional[str] = None
    
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

class PartsRequestItemOut(BaseModel):
    id: int
    part_code: str
    part_name: str
    quantity_requested: int
    quantity_approved: Optional[int] = None
    model_config = ConfigDict(from_attributes=True)

class PartsRequestOut(BaseModel):
    id: int
    work_order_id: int
    requested_by: int
    status: str
    rejection_reason: Optional[str] = None
    approved_by: Optional[int] = None
    created_at: Optional[str] = None
    approved_at: Optional[str] = None
    items: List[PartsRequestItemOut] = []
    # Enriched fields (added in the endpoint)
    requester_name: Optional[str] = None
    work_order_title: Optional[str] = None
    work_order_sap_id: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class StockMovement(BaseModel):
    id: int
    part_code: str
    part_name: str
    quantity: int
    type: str
    date: str
    user_id: int
    work_order_id: Optional[int] = None
    request_id: Optional[int] = None
    user_name: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class MagasinierStats(BaseModel):
    pending_requests: int
    approved_requests: int
    rejected_requests: int
    total_items_out: int
    critical_stock_alerts: int


