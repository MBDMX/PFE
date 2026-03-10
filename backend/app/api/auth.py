from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.models import User
from app.schemas.schemas import UserLogin, Token, UserOut, UserCreate
from app.core.security import verify_password, create_access_token, get_password_hash
from app.api.deps import get_current_user

router = APIRouter()

@router.post("/login", response_model=Token)
def login(u: UserLogin, db: Session = Depends(get_db)):
    # Standard check: Find user by username and role
    user = db.query(User).filter(User.username == u.username, User.role == u.role).first()
    
    if not user or not verify_password(u.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Identifiants ou rôle incorrects"
        )
    
    # Generate JWT with sub as "username:role"
    token = create_access_token(data={"sub": f"{user.username}:{user.role}"})
    
    return {
        "token": token,
        "user": user
    }

@router.post("/register", response_model=UserOut)
def register(u: UserCreate, db: Session = Depends(get_db)):
    # Check if user already exists
    if db.query(User).filter(User.username == u.username).first():
        raise HTTPException(status_code=400, detail="Nom d'utilisateur déjà pris")
        
    db_user = User(
        username=u.username,
        password_hash=get_password_hash(u.password),
        role=u.role,
        name=u.name
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    """ Returns the profile information of the currently authenticated user. """
    return current_user

@router.post("/logout")
def logout():
    """ Placeholder for logout (JWT is stateless, so we just acknowledge) """
    return {"message": "Déconnexion réussie"}
