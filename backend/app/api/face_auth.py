from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import json
import math
from typing import List

from app.db.session import get_db
from app.models.models import User
from app.api.auth import make_token_data
from app.core.security import create_access_token, create_refresh_token
from app.api.deps import get_current_user
from pydantic import BaseModel

router = APIRouter()

class FaceDescriptorSchema(BaseModel):
    descriptor: List[float]

def euclidean_distance(v1: List[float], v2: List[float]) -> float:
    if len(v1) != len(v2):
        return 1.0 # Max distance
    return math.sqrt(sum((a - b) ** 2 for a, b in zip(v1, v2)))

@router.post("/face/enroll")
def enroll_face(
    data: FaceDescriptorSchema, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Saves the 128-float descriptor as a JSON string for the current user."""
    current_user.face_descriptor = json.dumps(data.descriptor)
    db.commit()
    return {"message": "Visage enregistré avec succès"}

@router.post("/face/login")
def face_login(data: FaceDescriptorSchema, db: Session = Depends(get_db)):
    """
    Finds a user whose stored descriptor matches the input.
    Uses Euclidean distance (match if < 0.6).
    """
    users = db.query(User).filter(User.face_descriptor != None).all()
    
    best_match = None
    min_dist = 0.6 # Standard threshold for face-api.js
    
    for user in users:
        stored_descriptor = json.loads(user.face_descriptor)
        dist = euclidean_distance(data.descriptor, stored_descriptor)
        
        if dist < min_dist:
            min_dist = dist
            best_match = user
            
    if not best_match:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Visage non reconnu"
        )
        
    # Generate tokens
    token_data    = make_token_data(best_match)
    access_token  = create_access_token(data=token_data)
    refresh_token = create_refresh_token(data=token_data)
    
    return {
        "access_token":  access_token,
        "refresh_token": refresh_token,
        "token_type":    "bearer",
        "user": {
            "id": best_match.id,
            "username": best_match.username,
            "role": best_match.role,
            "name": best_match.name
        }
    }
