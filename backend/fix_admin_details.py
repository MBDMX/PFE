import asyncio
from prisma import Prisma
from app.core.security import get_password_hash

async def fix_admin_details():
    db = Prisma()
    await db.connect()
    
    # Update admin details
    user = await db.user.update(
        where={"username": "admin"},
        data={
            "role": "admin",
            "name": "Admin Système",
            "password_hash": get_password_hash("admin123")
        }
    )
    if user:
        print(f"Updated user '{user.username}': Role={user.role}, Name={user.name}")
    else:
        print("User 'admin' not found.")
        
    await db.disconnect()

if __name__ == "__main__":
    asyncio.run(fix_admin_details())
