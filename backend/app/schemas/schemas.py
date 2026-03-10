from pydantic import BaseModel, ConfigDict, EmailStr, Field
from typing import List, Optional

class UserLogin(BaseModel):
    identifier: str = Field(..., description="Username or Email")
    password: str
    role: str

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

class Machine(MachineBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class StockBase(BaseModel):
    name: str; reference: str; quantity: int; min_quantity: int; unit: str

class Stock(StockBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class Stats(BaseModel):
    totalMachines: int
    operational: int
    openOrders: int
    lowStock: int
