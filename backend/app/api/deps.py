from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from prisma import Prisma
from app.db.session import get_db
from app.core.config import settings

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

async def get_current_user(
    db: Prisma = Depends(get_db),
    token: str = Depends(oauth2_scheme)
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("type") != "access":
            raise credentials_exception
        sub: str = payload.get("sub")
        if sub is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = await db.user.find_unique(where={"username": sub})
    if user is None:
        raise credentials_exception
    return user


def admin_required(current_user=Depends(get_current_user)):
    async def _check(current_user=Depends(get_current_user)):
        if current_user.role != "admin":
            print(f"🚫 ACCESS DENIED: User '{current_user.username}' has role '{current_user.role}'. Required: ['admin']")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Seul un administrateur peut effectuer cette action"
            )
        return current_user
    return _check


def role_required(allowed_roles: list):
    async def dependency(current_user=Depends(get_current_user)):
        user_role = current_user.role.lower() if current_user.role else ""
        if user_role not in [r.lower() for r in allowed_roles]:
            print(f"DEBUG: 403 Forbidden for user {current_user.username} with role {current_user.role}. Allowed: {allowed_roles}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Accès refusé pour le rôle {current_user.role}. Rôles autorisés: {allowed_roles}"
            )
        return current_user
    return dependency
