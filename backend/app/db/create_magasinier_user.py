import asyncio
from prisma import Prisma
from app.core.security import get_password_hash

async def create_magasinier():
    db = Prisma()
    await db.connect()
    
    try:
        # Check if user already exists
        existing_user = await db.user.find_unique(where={"username": "magasinier"})
        if existing_user:
            print(f"User 'magasinier' already exists with ID: {existing_user.id}")
            return

        # Create the magasinier user
        user = await db.user.create(
            data={
                "username": "magasinier",
                "email": "magasinier@gmao-pro.com",
                "password_hash": get_password_hash("password"),
                "role": "magasinier",
                "name": "Magasinier Profil",
                "team": "Logistique"
            }
        )
        print("Successfully created magasinier profile!")
        print(f"Username: {user.username}")
        print(f"Password: password")
        print(f"Role: {user.role}")
        
    except Exception as e:
        print(f"Error creating user: {e}")
    finally:
        await db.disconnect()

if __name__ == "__main__":
    asyncio.run(create_magasinier())
