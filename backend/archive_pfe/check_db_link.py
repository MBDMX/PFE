import asyncio
from prisma import Prisma

async def check():
    db = Prisma()
    await db.connect()
    
    wo = await db.workorder.find_first()
    machine = await db.machine.find_first()
    
    print("--- DATA CHECK ---")
    if wo:
        print(f"WorkOrder sample: ID={wo.id}, EquipmentID={wo.equipment_id} (Type: {type(wo.equipment_id)})")
    else:
        print("No WorkOrders found")
        
    if machine:
        print(f"Machine sample: ID={machine.id}, Ref={machine.reference} (Type: {type(machine.id)})")
    else:
        print("No Machines found")
    
    await db.disconnect()

if __name__ == "__main__":
    asyncio.run(check())
