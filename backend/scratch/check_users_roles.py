import asyncio
from app.db.session import prisma

async def check():
    await prisma.connect()
    users = await prisma.user.find_many()
    print(f"{'ID':<5} | {'Username':<15} | {'Role':<15} | {'Name':<20}")
    print("-" * 60)
    for u in users:
        print(f"{u.id:<5} | {u.username:<15} | {u.role:<15} | {u.name or '':<20}")
    await prisma.disconnect()

if __name__ == "__main__":
    asyncio.run(check())
