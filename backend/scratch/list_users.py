import asyncio
from prisma import Prisma

async def main():
    db = Prisma()
    await db.connect()
    users = await db.user.find_many()
    print("--- USERS ---")
    for u in users:
        print(f"ID: {u.id} | Name: {u.name} | Role: {u.role} | Username: {u.username}")
    await db.disconnect()

if __name__ == '__main__':
    asyncio.run(main())
