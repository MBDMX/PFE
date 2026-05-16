import asyncio
from prisma import Prisma

async def main():
    db = Prisma()
    await db.connect()
    users = await db.user.find_many()
    print("--- USER LIST ---")
    for u in users:
        print(f"ID: {u.id} | Username: {u.username} | Role: {u.role}")
    print("-----------------")
    await db.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
