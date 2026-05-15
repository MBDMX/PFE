import asyncio
from prisma import Prisma

async def check():
    db = Prisma()
    await db.connect()
    
    # On regarde les 20 derniers ordres de travail venant de SAP
    wos = await db.workorder.find_many(
        where={"sap_order_id": {"not": None}},
        take=20
    )
    
    print("--- SAP DATA ANALYSIS ---")
    if not wos:
        print("Aucun ordre de travail SAP trouvé en base.")
    else:
        for o in wos:
            print(f"OT #{o.sap_order_id}")
            print(f"  Title: {o.title}")
            print(f"  Type: {o.type}")
            print(f"  Cause (failure_cause): {o.failure_cause}")
            print(f"  Desc: {o.description[:100]}...")
            print("-" * 20)
            
    await db.disconnect()

if __name__ == "__main__":
    asyncio.run(check())
