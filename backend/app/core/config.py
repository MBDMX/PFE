import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "GMAO PRO API"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "MaCleSecreteSuperLonguePourGMAO2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./gmao-pro.db")

settings = Settings()
