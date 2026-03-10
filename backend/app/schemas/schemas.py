from pydantic import BaseModel, ConfigDict
from typing import List, Optional

class UserLogin(BaseModel):
    username: str
    password: str
    role: str

class UserCreate(BaseModel):
    username: str
    password: str
    role: str
    name: str

class UserOut(BaseModel):
    id: int
    username: str
    role: str
    name: str
    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    token: str
    user: UserOut

class MachineBase(BaseModel):
    name: str; reference: str; location: str; status: str; health_score: int

class MachineCreate(MachineBase):
    pass

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
