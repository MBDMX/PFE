import asyncio
from app.db.session import prisma

async def test():
    await prisma.connect()
    try:
        # Test fetching WO #1 with includes
        order = await prisma.workorder.find_unique(
            where={'id': 1},
            include={"parts": True, "steps": True}
        )
        print("Order found:", order.id if order else "None")
        if order:
            from fastapi.encoders import jsonable_encoder
            data = jsonable_encoder(order)
            print("Serialization successful!")
    except Exception as e:
        print("Error during test:", e)
    finally:
        await prisma.disconnect()

if __name__ == "__main__":
    asyncio.run(test())
