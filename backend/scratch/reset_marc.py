import asyncio
from prisma import Prisma
import os
import sys

sys.path.append(os.getcwd())
from app.core.security import get_password_hash

async def reset_marc():
    db = Prisma()
    await db.connect()
    
    password_hash = get_password_hash("1234")
    user = await db.user.update(
        where={"username": "tech_meca"},
        data={"password_hash": password_hash}
    )
    print(f"✅ Mot de passe de {user.username} réinitialisé à: 1234")
    await db.disconnect()

if __name__ == "__main__":
    asyncio.run(reset_marc())
