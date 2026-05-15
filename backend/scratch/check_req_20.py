import asyncio
from prisma import Prisma
import os
import sys

sys.path.append(os.getcwd())

async def check_req_20():
    db = Prisma()
    await db.connect()
    r = await db.partsrequest.find_unique(where={'id': 20}, include={'items': True})
    if r:
        print(f"Demande #{r.id} - Status: {r.status}")
        for it in r.items:
            # Trouver la pièce correspondante dans le stock pour voir son ID et Image
            stock = await db.stock.find_first(where={"reference": it.part_code})
            print(f"  - Item: {it.part_name} (Code: {it.part_code})")
            if stock:
                print(f"    -> Stock ID: {stock.id}, Image: {stock.image}")
            else:
                print(f"    -> ⚠️ Pas trouvé dans le Stock !")
    else:
        print("❌ Demande #20 non trouvée.")
    await db.disconnect()

if __name__ == "__main__":
    asyncio.run(check_req_20())
