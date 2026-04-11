from fastapi import APIRouter, Depends, HTTPException, status
from prisma import Prisma
from app.db.session import get_db
from app.schemas.schemas import UserLogin, Token, UserOut, UserCreate, TokenRefreshRequest
from app.core.security import verify_password, create_access_token, create_refresh_token, get_password_hash
from app.api.deps import get_current_user
from jose import jwt, JWTError
from app.core.config import settings

router = APIRouter()

def make_token_data(user) -> dict:
    """Single source of truth for JWT payload — always includes id, sub, role, name."""
    return {
        "id":   user.id,
        "sub":  user.username,
        "role": user.role,
        "name": user.name,
    }

@router.post("/login", response_model=Token)
async def login(u: UserLogin, db: Prisma = Depends(get_db)):
    user = await db.user.find_first(
        where={"OR": [{"username": u.identifier}, {"email": u.identifier}]}
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Utilisateur introuvable (vérifiez l'identifiant)"
        )

    if not verify_password(u.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Mot de passe incorrect"
        )

    data          = make_token_data(user)
    access_token  = create_access_token(data=data)
    refresh_token = create_refresh_token(data=data)

    return {
        "access_token":  access_token,
        "refresh_token": refresh_token,
        "token_type":    "bearer",
        "user":          user,
    }

@router.post("/register", response_model=UserOut)
async def register(u: UserCreate, db: Prisma = Depends(get_db)):
    existing_username = await db.user.find_unique(where={"username": u.username})
    if existing_username:
        raise HTTPException(status_code=400, detail="Ce nom d'utilisateur est déjà utilisé")

    existing_email = await db.user.find_unique(where={"email": u.email})
    if existing_email:
        raise HTTPException(status_code=400, detail="Cet email est déjà enregistré")

    db_user = await db.user.create(data={
        "username":      u.username,
        "email":         u.email,
        "password_hash": get_password_hash(u.password),
        "role":          u.role,
        "name":          u.name,
    })
    return db_user

@router.post("/refresh", response_model=Token)
async def refresh_token(req: TokenRefreshRequest, db: Prisma = Depends(get_db)):
    try:
        payload = jwt.decode(req.refresh_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Token de rafraîchissement invalide")
        sub = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=401, detail="Token expiré ou invalide")

    user = await db.user.find_unique(where={"username": sub})
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")

    data          = make_token_data(user)
    new_access    = create_access_token(data=data)
    new_refresh   = create_refresh_token(data=data)

    return {
        "access_token":  new_access,
        "refresh_token": new_refresh,
        "token_type":    "bearer",
        "user":          user,
    }

@router.get("/me", response_model=UserOut)
async def get_me(current_user=Depends(get_current_user)):
    return current_user