from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.models import User
from app.schemas.schemas import UserLogin, Token
from app.core.security import verify_password, create_access_token

router = APIRouter()

@router.post("/login", response_model=Token)
def login(u: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == u.username, User.role == u.role).first()
    if not user or not verify_password(u.password, user.password_hash):
        raise HTTPException(401, "Identifiants invalides")
    
    token = create_access_token(data={"sub": f"{user.username}:{user.role}"})
    return {
        "token": token,
        "user": {"id": user.id, "username": user.username, "role": user.role, "name": user.name}
    }
