import asyncio
import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from prisma import Prisma
from app.core.security import get_password_hash

async def reset_pw():
    db = Prisma()
    await db.connect()
    
    passwords = {
        "admin": "Admin123!",
        "resp1": "Resp123!",
        "tech_meca": "Tech123!",
        "magasinier1": "mag123",
        "manager": "password",
        "resp2": "password",
        "tech_elec": "password",
        "tech_hydra": "password",
        "tech_hvac": "password"
    }
    
    updated = []
    for username, pwd in passwords.items():
        user = await db.user.find_first(where={"username": username})
        if user:
            await db.user.update(where={"id": user.id}, data={"password_hash": get_password_hash(pwd)})
            updated.append(username)
            print(f"Updated {username} -> {pwd}")
    
    await db.disconnect()
    print("Done!")

if __name__ == "__main__":
    asyncio.run(reset_pw())
