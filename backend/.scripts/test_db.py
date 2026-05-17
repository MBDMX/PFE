from sqlalchemy import create_engine
import sys

url = "postgresql://gmao_user:gmao_password@127.0.0.1:5432/gmao_db"
engine = create_engine(url)
try:
    with engine.connect() as conn:
        print("SQLAlchemy connection SUCCESS")
except Exception as e:
    print(f"SQLAlchemy connection FAILED: {e}")
