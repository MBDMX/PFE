import asyncio
from prisma import Prisma
import os
import sys

sys.path.append(os.getcwd())

async def list_stock():
    db = Prisma()
    await db.connect()
    items = await db.stock.find_many()
    print(f"{'ID':<5} | {'Ref':<15} | {'Name':<30} | {'Image':<30}")
    print("-" * 85)
    for i in items:
        print(f"{i.id:<5} | {i.reference:<15} | {i.name:<30} | {i.image or '':<30}")
    await db.disconnect()

if __name__ == "__main__":
    asyncio.run(list_stock())
