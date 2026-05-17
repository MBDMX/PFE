import asyncio
from prisma import Prisma

async def fix_admin_role():
    db = Prisma()
    await db.connect()
    
    # Check if user exists
    user = await db.user.find_unique(where={"username": "admin"})
    if user:
        print(f"Current role for 'admin': {user.role}")
        if user.role != "admin":
            await db.user.update(
                where={"username": "admin"},
                data={"role": "admin"}
            )
            print("Role updated to 'admin'")
        else:
            print("Role is already 'admin'")
    else:
        print("User 'admin' not found.")
        
    await db.disconnect()

if __name__ == "__main__":
    asyncio.run(fix_admin_role())
