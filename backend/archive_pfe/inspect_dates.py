import asyncio
from prisma import Prisma

async def inspect_data():
    db = Prisma()
    await db.connect()
    
    print("--- 📅 INSPECTION DES ORDRES DE TRAVAIL ---")
    orders = await db.workorder.find_many(take=5, order={'created_at': 'desc'})
    for o in orders:
        print(f"ID: {o.id}, Title: {o.title}, Type: {o.type}, Date: '{o.planned_start_date}'")
    
    print("\n--- 🖼️ INSPECTION DES IMAGES DE STOCK ---")
    parts = await db.stock.find_many(take=5)
    for p in parts:
        print(f"ID: {p.id}, Part: {p.name}, Image URL: '{p.image}'")
        
    await db.disconnect()

if __name__ == "__main__":
    asyncio.run(inspect_data())
