import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "GMAO PRO API"
    SECRET_KEY: str = "MaCleSecreteSuperLonguePourGMAO2026"
    ALGORITHM: str = "HS256"

    # JWT Expiration
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60  # 1 hour
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7     # 7 days

    # PostgreSQL via Prisma
    DATABASE_URL: str = "postgresql://gmao_user:gmao_password@localhost:5432/gmao_db"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()
