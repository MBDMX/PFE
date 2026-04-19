import asyncio
from app.db.session import prisma

async def main():
    await prisma.connect()
    count = await prisma.machine.count()
    print(f"DATABASE_MACHINE_COUNT={count}")
    await prisma.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
