import asyncio
from prisma import Prisma
from app.db.seed import execute_seed_data

async def main():
    db = Prisma()
    await db.connect()
    try:
        await execute_seed_data(db)
    finally:
        await db.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
