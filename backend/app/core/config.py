import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "GMAO PRO API"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "MaCleSecreteSuperLonguePourGMAO2026")
    ALGORITHM: str = "HS256"
    
    # JWT Expiration
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60  # 1 hour
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7     # 7 days
    
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./gmao-pro.db")

settings = Settings()
