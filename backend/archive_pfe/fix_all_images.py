import asyncio
import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from prisma import Prisma
from app.core.image_service import generate_and_save


async def fix_all():
    db = Prisma()
    await db.connect()

    print("🚀 Téléchargement d'images industrielles réelles (LoremFlickr)...\n")

    parts = await db.stock.find_many()
    total = len(parts)
    os.makedirs("static/parts", exist_ok=True)

    success, failed = 0, []

    for i, part in enumerate(parts):
        file_path = f"static/parts/part_{part.id}.jpg"

        # Skip si JPEG valide déjà présent
        if os.path.exists(file_path):
            try:
                with open(file_path, "rb") as f:
                    if f.read(3) == b'\xff\xd8\xff':
                        print(f"✔️  [{i+1}/{total}] {part.name} — OK")
                        success += 1
                        continue
                    else:
                        os.remove(file_path)
            except Exception:
                pass

        print(f"\n📦 [{i+1}/{total}] {part.name} (ID: {part.id})")
        try:
            new_url = await generate_and_save(part.name, str(part.id), force=False)
            if new_url:
                await db.stock.update(where={"id": part.id}, data={"image": new_url})
                success += 1
            else:
                failed.append(f"{part.name}#{part.id}")
        except Exception as e:
            print(f"   ⚠️ {e}")
            failed.append(f"{part.name}#{part.id}")

        await asyncio.sleep(0.3)

    await db.disconnect()
    print(f"\n🏁 {success}/{total} images téléchargées.")
    if failed:
        print(f"❌ Échecs: {', '.join(failed)}")


if __name__ == "__main__":
    asyncio.run(fix_all())
