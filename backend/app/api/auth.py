from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.db.session import get_db
from app.models.models import User
from app.schemas.schemas import UserLogin, Token, UserOut, UserCreate, TokenRefreshRequest
from app.core.security import verify_password, create_access_token, create_refresh_token, get_password_hash
from app.api.deps import get_current_user
from jose import jwt, JWTError
from app.core.config import settings

router = APIRouter()

@router.post("/login", response_model=Token)
def login(u: UserLogin, db: Session = Depends(get_db)):
    # 1. Search by Username OR Email
    user = db.query(User).filter(
        or_(User.username == u.identifier, User.email == u.identifier),
        User.role == u.role
    ).first()
    
    # Precise Error: If user doesn't exist
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Utilisateur introuvable (vérifiez l'identifiant et le rôle)"
        )
    
    # Precise Error: If password is wrong
    if not verify_password(u.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Mot de passe incorrect"
        )
    
    # 2. Generate Tokens
    access_token = create_access_token(data={"sub": user.username})
    refresh_token = create_refresh_token(data={"sub": user.username})
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": user
    }

@router.post("/register", response_model=UserOut)
def register(u: UserCreate, db: Session = Depends(get_db)):
    # Check uniqueness
    if db.query(User).filter(User.username == u.username).first():
        raise HTTPException(status_code=400, detail="Ce nom d'utilisateur est déjà utilisé")
    
    if db.query(User).filter(User.email == u.email).first():
        raise HTTPException(status_code=400, detail="Cet email est déjà enregistré")
        
    db_user = User(
        username=u.username,
        email=u.email,
        password_hash=get_password_hash(u.password),
        role=u.role,
        name=u.name
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.post("/refresh", response_model=Token)
def refresh_token(req: TokenRefreshRequest, db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(req.refresh_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Token de rafraîchissement invalide")
        sub = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=401, detail="Token expiré ou invalide")
        
    user = db.query(User).filter(User.username == sub).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
        
    new_access = create_access_token(data={"sub": user.username})
    new_refresh = create_refresh_token(data={"sub": user.username}) # Rotate refresh token
    
    return {
        "access_token": new_access,
        "refresh_token": new_refresh,
        "token_type": "bearer",
        "user": user
    }

@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
