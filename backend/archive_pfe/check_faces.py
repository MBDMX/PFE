import asyncio
from prisma import Prisma

async def main():
    db = Prisma()
    await db.connect()
    
    users = await db.user.find_many()
    print("\n--- STATUS DES EMPREINTES FACIALES ---")
    found = False
    for u in users:
        desc = getattr(u, 'face_descriptor', None)
        if desc:
            found = True
            print(f"[OK] Utilisateur: {u.username} | Empreinte: Presente")
        else:
            print(f"[--] Utilisateur: {u.username} | Empreinte: Vide")
    
    if not found:
        print("\n!!! AUCUN VISAGE ENREGISTRE DANS LA BASE !!!")
        
    await db.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
