import asyncio
from prisma import Prisma
from app.core.security import get_password_hash

async def reset_admin():
    db = Prisma()
    await db.connect()
    
    # Reset admin password
    new_hash = get_password_hash("admin123")
    user = await db.user.update(
        where={"username": "admin"},
        data={"password_hash": new_hash}
    )
    
    if user:
        print(f"Successfully reset password for user: {user.username}")
        print("New credentials:")
        print("Username: admin")
        print("Password: admin123")
    else:
        print("User 'admin' not found.")
        
    await db.disconnect()

if __name__ == "__main__":
    asyncio.run(reset_admin())
