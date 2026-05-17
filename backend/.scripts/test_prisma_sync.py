import asyncio
from prisma import Prisma

async def test_model():
    db = Prisma()
    await db.connect()
    try:
        user = await db.user.find_first()
        if user:
            print(f"User ID: {user.id}")
            print(f"Is Active: {getattr(user, 'is_active', 'MISSING')}")
            print(f"Permissions: {getattr(user, 'permissions', 'MISSING')}")
    except Exception as e:
        print(f"Error accessing model: {e}")
    await db.disconnect()

if __name__ == "__main__":
    asyncio.run(test_model())
