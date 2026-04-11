from prisma import Prisma
from sqlalchemy.orm import declarative_base

Base = declarative_base()

# Singleton Prisma client
prisma = Prisma()

async def get_db() -> Prisma:
    """FastAPI dependency: returns the connected Prisma client."""
    if not prisma.is_connected():
        await prisma.connect()
    return prisma
