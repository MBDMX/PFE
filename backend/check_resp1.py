
import asyncio
from prisma import Prisma

async def check_user():
    db = Prisma()
    await db.connect()
    
    user = await db.user.find_unique(where={'username': 'resp1'})
    if user:
        has_face = bool(user.face_descriptor)
        print(f"USER: {user.username}")
        print(f"HAS FACE ID: {has_face}")
        if has_face:
            # Check if it's single or multi sample
            import json
            try:
                data = json.loads(user.face_descriptor)
                is_multi = isinstance(data, list) and len(data) > 0 and isinstance(data[0], list)
                print(f"FORMAT: {'Multi-sample (5 points)' if is_multi else 'Single sample (Legacy)'}")
                if is_multi:
                    print(f"SAMPLES COUNT: {len(data)}")
            except:
                print("FORMAT: Invalid JSON")
    else:
        print("USER NOT FOUND")
        
    await db.disconnect()

if __name__ == "__main__":
    asyncio.run(check_user())
