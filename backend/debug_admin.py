import asyncio
from prisma import Prisma

async def check():
    db = Prisma()
    await db.connect()
    user = await db.user.find_unique(where={"username": "admin"})
    print(f"DEBUG: admin user -> role: {user.role}, name: {user.name}, is_active: {user.is_active}")
    await db.disconnect()

if __name__ == "__main__":
    asyncio.run(check())
