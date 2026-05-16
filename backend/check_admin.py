import asyncio
from prisma import Prisma

async def main():
    db = Prisma()
    await db.connect()
    user = await db.user.find_unique(where={'username': 'admin'})
    if user:
        print(f"User: {user.username}, Role: {user.role}")
    else:
        print("User admin not found")
    await db.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
