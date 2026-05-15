"""
Image Service — Système de cache par catégorie.
- Télécharge chaque image Wikipedia UNE SEULE FOIS par catégorie (~25 requêtes max).
- Copie l'image pour toutes les pièces du même type (aucun rate-limit).
- Fallback PIL stylisé si Wikipedia échoue.
"""
import os
import asyncio
import urllib.request
import json
import shutil
import time

os.makedirs("static/parts", exist_ok=True)
os.makedirs("static/parts/cache", exist_ok=True)
download_semaphore = asyncio.Semaphore(4)

# ─── Dictionnaire : mot-clé → page Wikipedia EN ──────────────────────────────
WIKIPEDIA_PAGES = {
    "moteur":         "Electric_motor",
    "pompe":          "Centrifugal_pump",
    "vanne":          "Gate_valve",
    "roulement":      "Rolling-element_bearing",
    "joint":          "O-ring",
    "verin":          "Hydraulic_cylinder",
    "accouplement":   "Flexible_coupling",
    "engrenage":      "Gear",
    "turbine":        "Steam_turbine",
    "turbo":          "Turbocharger",
    "ventilateur":    "Centrifugal_fan",
    "compresseur":    "Air_compressor",
    "courroie":       "Belt_(mechanical)",
    "filtre":         "Oil_filter",
    "capteur":        "Sensor",
    "sonde":          "Thermocouple",
    "thermocouple":   "Thermocouple",
    "variateur":      "Variable-frequency_drive",
    "automate":       "Programmable_logic_controller",
    "disjoncteur":    "Circuit_breaker",
    "relais":         "Relay",
    "transformateur": "Transformer",
    "reducteur":      "Gearbox",
    "pignon":         "Sprocket",
    "chaine":         "Roller_chain",
    "arbre":          "Driveshaft",
    "palier":         "Bearing_(mechanical)",
    "bride":          "Flange",
    "tuyau":          "Pipe_(fluid_conveyance)",
    "clapet":         "Check_valve",
    "cuve":           "Storage_tank",
    "agitation":      "Industrial_mixer",
    "agitateur":      "Industrial_mixer",
    "convoyeur":      "Conveyor_belt",
    "vis":            "Auger_(drill)",
    "ecrou":          "Nut_(hardware)",
    "ressort":        "Coil_spring",
    "resistance":     "Heating_element",
    "resistances":    "Heating_element",
    "chauffage":      "Heating_element",
    "aimant":         "Neodymium_magnet",
    "cable":          "Electrical_cable",
    "contacteur":     "Contactor",
    "fusible":        "Fuse_(electrical)",
    "encodeur":       "Rotary_encoder",
    "doseur":         "Metering_pump",
    "extrusion":      "Extruder",
    # Nouveaux mappings
    "adaptateur":     "Piping_and_plumbing_fitting",
    "aspirateur":     "Vacuum_cleaner",
    "ventilation":    "Ventilation_(architecture)",
    "bras":           "Robotic_arm",
    "pale":           "Impeller",
    "pales":          "Impeller",
    "regulateur":     "Pressure_regulator",
    "surpresseur":    "Compressor",
    "tamis":          "Sieve",
    "tremie":         "Hopper_(engineering)",
    "silicone":       "Silicone",
    "reservoir":      "Storage_tank",
    "lame":           "Blade_(archaeology)",
    "silo":           "Silo",
    "encodeur":       "Rotary_encoder",
    "rouleau":        "Roller_bearing",
    "pompe":          "Centrifugal_pump",
}

# Cache en mémoire : page_wikipedia → chemin local du fichier catégorie
_category_cache: dict[str, str | None] = {}


def _normalize(text: str) -> str:
    import unicodedata
    return ''.join(
        c for c in unicodedata.normalize('NFD', text.lower())
        if unicodedata.category(c) != 'Mn'
    )


def _find_category(part_name: str) -> tuple[str, str] | tuple[None, None]:
    """Retourne (keyword, wikipedia_page) pour la pièce donnée."""
    normalized = _normalize(part_name)
    for keyword, page in WIKIPEDIA_PAGES.items():
        if _normalize(keyword) in normalized:
            return keyword, page
    return None, None


def _download_sync(url: str, filepath: str) -> bool:
    try:
        req = urllib.request.Request(url, headers={
            "User-Agent": "Mozilla/5.0 (compatible; GMAO-PFE/1.0)",
            "Accept": "image/jpeg,image/png,image/*"
        })
        with urllib.request.urlopen(req, timeout=12) as resp:
            content = resp.read()
        if len(content) > 3 and (content[:3] == b'\xff\xd8\xff' or content[:4] == b'\x89PNG'):
            # Convertir PNG en JPEG
            if content[:4] == b'\x89PNG':
                try:
                    from PIL import Image
                    import io
                    img = Image.open(io.BytesIO(content)).convert("RGB")
                    buf = io.BytesIO()
                    img.save(buf, format="JPEG", quality=88)
                    content = buf.getvalue()
                except Exception:
                    pass
            with open(filepath, "wb") as f:
                f.write(content)
            return True
    except Exception as e:
        print(f"      ⚠️ Download error: {e}")
    return False


def _get_wikipedia_thumbnail(page_name: str) -> str | None:
    """Récupère l'URL du thumbnail Wikipedia (320px, autorisé par leur politique)."""
    try:
        url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{page_name}"
        req = urllib.request.Request(url, headers={
            "User-Agent": "GMAO-PFE/1.0 (Educational project)",
            "Accept": "application/json"
        })
        with urllib.request.urlopen(req, timeout=8) as resp:
            data = json.loads(resp.read())
        thumb = data.get("thumbnail")
        if thumb:
            # On prend la taille standard autorisée (320px) - ne pas modifier!
            return thumb.get("source")
    except Exception as e:
        print(f"      ⚠️ Wikipedia API: {e}")
    return None


def _get_or_download_category(keyword: str, page: str) -> str | None:
    """
    Télécharge l'image de catégorie UNE SEULE FOIS et la met en cache.
    Pour les appels suivants, retourne directement le chemin local.
    """
    global _category_cache

    # Déjà en cache ?
    cache_key = f"cat_{keyword}"
    if cache_key in _category_cache:
        return _category_cache[cache_key]

    cache_path = f"static/parts/cache/{keyword}.jpg"

    # Fichier déjà téléchargé sur disque ?
    if os.path.exists(cache_path):
        try:
            with open(cache_path, "rb") as f:
                if f.read(3) == b'\xff\xd8\xff':
                    _category_cache[cache_key] = cache_path
                    return cache_path
        except Exception:
            pass

    # Téléchargement Wikipedia (1 seule fois par catégorie)
    print(f"   🌐 Téléchargement catégorie '{keyword}' → Wikipedia: {page}")
    time.sleep(1.0)  # Respecte les délais Wikipedia entre catégories
    img_url = _get_wikipedia_thumbnail(page)
    if img_url and _download_sync(img_url, cache_path):
        _category_cache[cache_key] = cache_path
        print(f"      ✅ Cache: {cache_path}")
        return cache_path

    # Échec → on marque None pour ne pas réessayer
    _category_cache[cache_key] = None
    print(f"      ↩️  Fallback PIL pour catégorie '{keyword}'")
    return None


def _generate_placeholder(part_name: str, part_id: str) -> bool:
    """Génère un placeholder professionnel avec PIL — initiales lisibles en Arial Bold."""
    try:
        from PIL import Image, ImageDraw, ImageFont
        import hashlib, colorsys

        filepath = f"static/parts/part_{part_id}.jpg"

        # Couleur déterministe basée sur le nom
        h = int(hashlib.md5(_normalize(part_name).encode()).hexdigest()[:6], 16)
        hue = (h % 360) / 360.0
        r1, g1, b1 = colorsys.hsv_to_rgb(hue, 0.65, 0.28)
        r2, g2, b2 = colorsys.hsv_to_rgb((hue + 0.04) % 1, 0.55, 0.48)

        dark   = (int(r1 * 255), int(g1 * 255), int(b1 * 255))
        accent = (int(r2 * 255), int(g2 * 255), int(b2 * 255))
        white  = (240, 240, 255)

        img = Image.new('RGB', (500, 500), dark)
        draw = ImageDraw.Draw(img)

        # Bandes accent haut/bas
        draw.rectangle([0, 0, 500, 70], fill=accent)
        draw.rectangle([0, 430, 500, 500], fill=accent)

        # Cercle central décoratif
        draw.ellipse([120, 110, 380, 370], outline=accent, width=10)
        draw.ellipse([150, 140, 350, 340], outline=white, width=3)

        # Initiales en grand (cherche Arial Bold sur Windows, sinon font par défaut)
        initials = ''.join(w[0] for w in part_name.split() if w)[:3].upper()
        font = None
        for font_path in [
            "C:/Windows/Fonts/arialbd.ttf",
            "C:/Windows/Fonts/arial.ttf",
            "C:/Windows/Fonts/calibrib.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        ]:
            if os.path.exists(font_path):
                try:
                    font = ImageFont.truetype(font_path, size=90)
                    break
                except Exception:
                    pass

        if font:
            draw.text((250, 240), initials, font=font, fill=white, anchor="mm")
        else:
            # Dernier recours : font bitmap par défaut (petite)
            draw.text((220, 220), initials, fill=white)

        img.save(filepath, 'JPEG', quality=88)
        return True
    except Exception:
        # Ultra-fallback : image unie colorée
        try:
            from PIL import Image
            img = Image.new('RGB', (500, 500), (25, 45, 80))
            img.save(f"static/parts/part_{part_id}.jpg", 'JPEG', quality=88)
            return True
        except Exception:
            pass
    return False


def _fetch_image(part_name: str, part_id: str) -> str:
    """Stratégie : cache catégorie Wikipedia → copie locale → fallback PIL."""
    local_filepath = f"static/parts/part_{part_id}.jpg"
    local_url = f"/static/parts/part_{part_id}.jpg"

    keyword, page = _find_category(part_name)

    if keyword and page:
        # Obtenir l'image de catégorie (téléchargée 1x, copiée ensuite)
        category_file = _get_or_download_category(keyword, page)
        if category_file and os.path.exists(category_file):
            try:
                shutil.copy(category_file, local_filepath)
                return local_url
            except Exception as e:
                print(f"      ⚠️ Copy error: {e}")
    else:
        print(f"   🔲 [{part_id}] {part_name} → placeholder PIL")

    # Fallback PIL
    if _generate_placeholder(part_name, part_id):
        return local_url

    return ""


async def generate_and_save(part_name: str, part_id: str, force: bool = False) -> str:
    local_filepath = f"static/parts/part_{part_id}.jpg"
    local_url = f"/static/parts/part_{part_id}.jpg"

    if not force and os.path.exists(local_filepath):
        try:
            with open(local_filepath, "rb") as f:
                if f.read(3) == b'\xff\xd8\xff':
                    return local_url
        except Exception:
            pass
        try:
            os.remove(local_filepath)
        except Exception:
            pass

    async with download_semaphore:
        result = await asyncio.to_thread(_fetch_image, part_name, part_id)
    return result


async def get_image_url_for_part(part_name: str, part_id: str = None, force: bool = False) -> str:
    if not part_name or not part_id:
        return ""
    return await generate_and_save(part_name, part_id, force)


async def process_missing_images():
    pass
