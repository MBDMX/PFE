import os
import asyncio
import requests

# ── Mapping catégorie → terme de recherche LoremFlickr (fiable, pas de rate-limit) ──
SEARCH_TERMS = {
    "cuve":           "tank",
    "cristalisateur": "machine",
    "turbo":          "turbine",
    "ventilateur":    "fan",
    "ventilation":    "fan",
    "resistance":     "heating",
    "sonde":          "sensor",
    "thermocouple":   "sensor",
    "regulateur":     "controller",
    "moteur":         "motor",
    "pompe":          "pump",
    "vanne":          "valve",
    "roulement":      "bearing",
    "joint":          "seal",
    "verin":          "cylinder",
    "automate":       "electronics",
    "capteur":        "sensor",
    "filtre":         "filter",
    "chaudiere":      "boiler",
    "compresseur":    "compressor",
    "variateur":      "electronics",
    "vis":            "screw",
    "rouleau":        "roller",
    "courroie":       "belt",
}

image_locks: dict = {}
download_semaphore = asyncio.Semaphore(5)


def _get_tag(part_name: str) -> str:
    name_lower = part_name.lower()
    for key, tag in SEARCH_TERMS.items():
        if key in name_lower:
            return tag
    return "machine"


def _download(url: str) -> bytes:
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "image/jpeg,image/png,image/*,*/*",
    }
    try:
        r = requests.get(url, headers=headers, timeout=15, allow_redirects=True)
        if r.status_code == 200:
            c = r.content
            if len(c) > 3 and (c[:3] == b'\xff\xd8\xff' or c[:4] == b'\x89PNG'):
                return c
    except Exception as e:
        print(f"   ⚠️ Download error: {e}")
    return b""


def _to_jpeg(content: bytes) -> bytes:
    if content[:4] == b'\x89PNG':
        try:
            from PIL import Image
            import io
            img = Image.open(io.BytesIO(content)).convert("RGB")
            buf = io.BytesIO()
            img.save(buf, format="JPEG", quality=90)
            return buf.getvalue()
        except Exception:
            pass
    return content


async def generate_and_save(part_name: str, part_id: str, force: bool = False) -> str:
    file_path = f"static/parts/part_{part_id}.jpg"

    if part_id not in image_locks:
        image_locks[part_id] = asyncio.Lock()

    async with image_locks[part_id]:
        if force and os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception:
                pass

        if not force and os.path.exists(file_path):
            try:
                with open(file_path, "rb") as f:
                    if f.read(3) == b'\xff\xd8\xff':
                        return f"/static/parts/part_{part_id}.jpg"
                os.remove(file_path)
            except Exception:
                pass

        async with download_semaphore:
            tag = _get_tag(part_name)
            # LoremFlickr: simple, fiable, pas de rate-limit, vraies photos
            url = f"https://loremflickr.com/500/500/{tag}?lock={part_id}"
            print(f"   🌐 {part_name} → loremflickr/{tag}?lock={part_id}")

            content = await asyncio.to_thread(_download, url)

            if content:
                jpeg = _to_jpeg(content)
                if jpeg[:3] == b'\xff\xd8\xff':
                    os.makedirs("static/parts", exist_ok=True)
                    with open(file_path, "wb") as f:
                        f.write(jpeg)
                    print(f"   ✅ Sauvé: {file_path}")
                    return f"/static/parts/part_{part_id}.jpg"
            else:
                print(f"   ❌ Échec pour '{part_name}'")

    return ""


async def get_image_url_for_part(part_name: str, part_id: str = None, force: bool = False) -> str:
    if not part_name or not part_id:
        return ""
    return await generate_and_save(part_name, part_id, force)


async def process_missing_images():
    pass
