import asyncio
from prisma import Prisma

async def check():
    db = Prisma()
    await db.connect()
    admin = await db.user.find_unique(where={"username": "admin"})
    manager = await db.user.find_unique(where={"username": "manager"})
    print(f"DEBUG: admin -> {admin.role if admin else 'NOT FOUND'}")
    print(f"DEBUG: manager -> {manager.role if manager else 'NOT FOUND'}")
    await db.disconnect()

if __name__ == "__main__":
    asyncio.run(check())
