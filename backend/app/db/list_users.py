import asyncio
from prisma import Prisma

async def list_users():
    db = Prisma()
    await db.connect()
    
    users = await db.user.find_many()
    print(f"{'ID':<5} | {'Username':<15} | {'Role':<15} | {'Name':<20}")
    print("-" * 60)
    for u in users:
        print(f"{u.id:<5} | {u.username:<15} | {u.role:<15} | {u.name or '':<20}")
        
    await db.disconnect()

if __name__ == "__main__":
    asyncio.run(list_users())
