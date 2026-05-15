import asyncio
import json
from prisma import Prisma

async def check():
    db = Prisma()
    await db.connect()
    users = await db.user.find_many()
    results = []
    for u in users:
        has_face = False
        face_len = 0
        if hasattr(u, 'face_descriptor') and u.face_descriptor:
            has_face = True
            try:
                data = json.loads(u.face_descriptor)
                # If it's a list of lists, count them
                if isinstance(data, list) and len(data) > 0 and isinstance(data[0], list):
                    face_len = len(data)
                else:
                    face_len = 1
            except:
                face_len = "Error parsing JSON"
        
        results.append({
            "id": u.id,
            "username": u.username,
            "name": u.name,
            "has_face": has_face,
            "samples": face_len
        })
    
    print("--- USER FACE PROFILES ---")
    print(json.dumps(results, indent=2))
    await db.disconnect()

if __name__ == "__main__":
    asyncio.run(check())
