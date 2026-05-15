"""
wikimedia_image_service.py
Fetches a relevant image from Wikimedia Commons for a mechanical spare part.

Flow:
  1. Build an English search query from the part name (FR→EN mapping)
  2. Hit the Wikimedia Commons Search API (action=query&generator=search)
  3. Pick the first result with a bitmap image
  4. Fetch the thumbnail URL via imageinfo (iiurlwidth=256 — allowed size)
  5. Download & resize the image
  6. Return "data:image/jpeg;base64,<b64>" ready to store in DB

Note: Using thumbnail size (256px) keeps base64 ~15-25KB per part.
      For 202 parts → ~4MB total in DB. Perfectly acceptable.
"""

import os
import re
import base64
import hashlib
import colorsys
import logging
from io import BytesIO
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

# ── FR → EN technical term mapping ───────────────────────────────────────────
_FR_TO_EN: list[tuple[str, str]] = [
    # Fasteners
    ("vis à métaux",          "machine screw"),
    ("vis sans fin",          "worm gear screw"),
    ("vis doseuse",           "dosing screw conveyor"),
    ("vis extrusion",         "extrusion screw"),
    ("vis",                   "screw fastener"),
    ("écrou",                 "hex nut"),
    ("boulon",                "bolt fastener"),
    # Bearings / transmission
    ("roulement à billes",    "ball bearing"),
    ("roulement à rouleaux",  "roller bearing"),
    ("roulement",             "rolling element bearing"),
    ("courroie trapézoïdale", "v-belt"),
    ("courroie",              "drive belt"),
    ("poulie",                "pulley mechanical"),
    ("engrenage",             "gear wheel metal"),
    ("chaîne",                "roller chain"),
    ("accouplement",          "shaft coupling flexible"),
    ("réducteur",             "gearbox speed reducer"),
    ("reducteur",             "gearbox speed reducer"),
    ("arbre agitateur",       "agitator shaft"),
    ("arbre mélange",         "mixing shaft"),
    ("arbre",                 "drive shaft steel"),
    ("palier",                "bearing housing"),
    ("moyeu",                 "shaft hub flange"),
    ("pignon",                "sprocket gear"),
    ("encodeur",              "rotary encoder"),
    ("variateur",             "variable frequency drive inverter"),
    # Seals / gaskets
    ("joint torique",         "o-ring seal"),
    ("joint plat",            "flat gasket"),
    ("joint spi",             "lip seal"),
    ("joint",                 "mechanical seal o-ring"),
    # Hydraulic / pneumatic
    ("vérin hydraulique",     "hydraulic cylinder"),
    ("vérin pneumatique",     "pneumatic cylinder"),
    ("vérins réglage",        "adjusting hydraulic cylinder"),
    ("vérin",                 "hydraulic cylinder actuator"),
    ("verin",                 "hydraulic cylinder actuator"),
    ("pompe hydraulique",     "hydraulic pump"),
    ("pompe",                 "centrifugal pump industrial"),
    ("vanne matière",         "industrial gate valve"),
    ("vanne sortie",          "outlet valve industrial"),
    ("vanne",                 "industrial valve gate"),
    ("clapet",                "check valve industrial"),
    ("flexible",              "hydraulic hose"),
    ("tuyau",                 "industrial steel pipe"),
    ("tuyaux",                "industrial steel pipe"),
    ("conduite",              "industrial pipeline"),
    ("bride",                 "pipe flange steel"),
    # Electrical
    ("contacteur",            "electrical contactor"),
    ("relais thermique",      "thermal relay overload"),
    ("relais",                "electrical relay"),
    ("fusible",               "electrical fuse"),
    ("disjoncteur",           "circuit breaker electrical"),
    ("variateur",             "variable frequency drive"),
    ("câble",                 "electrical cable industrial"),
    ("cable",                 "electrical cable industrial"),
    # Sensors & measurement
    ("capteur inductif",      "inductive proximity sensor"),
    ("capteur niveau",        "level sensor industrial"),
    ("capteur position",      "position sensor encoder"),
    ("capteur",               "industrial sensor"),
    ("sonde température",     "temperature probe sensor"),
    ("thermocouple",          "thermocouple temperature sensor"),
    ("thermostat",            "industrial thermostat"),
    # Heating
    ("résistances chauffage", "electric heating element"),
    ("résistances",           "electric heating element"),
    ("résistance",            "electric heating element"),
    ("chauffage",             "industrial heater element"),
    # Motors / rotation
    ("moteur agitateur",      "electric motor industrial"),
    ("moteur doseur",         "electric motor drive"),
    ("moteur électrique",     "electric motor"),
    ("moteur principal",      "electric motor main drive"),
    ("moteur",                "electric motor industrial"),
    ("motorisation",          "electric motor drive"),
    # Industrial equipment
    ("turbine aspiration",    "industrial centrifugal fan blower"),
    ("turbo",                 "turbocharger industrial blower"),
    ("turbine",               "steam turbine industrial"),
    ("ventilateur",           "centrifugal fan industrial"),
    ("ventilation",           "industrial ventilation fan"),
    ("compresseur",           "air compressor industrial"),
    ("filtre matière",        "industrial filter"),
    ("filtre à huile",        "hydraulic oil filter"),
    ("filtre air",            "air filter industrial"),
    ("filtre",                "industrial filter"),
    ("agitation cristalisateur", "industrial mixer agitator tank"),
    ("agitation",             "industrial mixer agitator"),
    ("agitateur",             "industrial agitator mixer"),
    ("doseur colorant",       "dosing pump feeder pigment"),
    ("doseur",                "metering dosing pump"),
    ("trémie",                "industrial hopper funnel"),
    ("tremie",                "industrial hopper funnel"),
    ("cuve cristalisateur",   "industrial crystallizer tank"),
    ("cuve mélangeur",        "mixing tank stainless"),
    ("cuve",                  "stainless steel tank industrial"),
    ("chambre dégazage",      "degassing vessel industrial"),
    ("convoyeur",             "conveyor belt industrial"),
    ("aspiration",            "vacuum industrial suction"),
    ("aspirateur",            "industrial vacuum suction"),
    ("rouleau",               "industrial roller bearing"),
    ("élastique",             "rubber coupling elastic element"),
    ("elastique",             "rubber coupling elastic element"),
    ("aimant",                "neodymium magnet industrial"),
    ("adaptateur",            "pipe fitting adapter coupling"),
    ("carter",                "gearbox housing casing"),
    ("corps pompe",           "pump casing housing"),
    ("corps",                 "machine housing casing"),
    ("bride",                 "pipe flange"),
    ("lame",                  "industrial blade cutting"),
    ("ressort",               "coil spring mechanical"),
    ("tige",                  "piston rod steel"),
    ("axe",                   "steel shaft axle"),
    ("pale",                  "impeller blade industrial"),
    ("pales",                 "impeller blade industrial"),
    ("couvercle",             "industrial cover lid"),
    ("pale",                  "impeller blade industrial"),
    ("pales",                 "industrial mixer blades"),
    ("couvercle",             "industrial cover lid"),
    ("réservoir",             "industrial storage tank"),
    ("surpresseur",           "pressure booster compressor"),
    ("tamis",                 "industrial sieve mesh"),
    # General mechanical (Clean Catalog Terms)
    ("roulement",             "rolling element bearing skf"),
    ("joint",                 "mechanical seal o-ring gasket"),
    ("vis",                   "hex bolt screw"),
    ("ecrou",                 "hex nut"),
    ("pignon",                "industrial sprocket gear"),
    ("chaîne",                "industrial roller chain"),
    ("flexible",              "hydraulic hose coupling"),
    ("vanne",                 "industrial ball valve"),
    ("moteur",                "electric motor siemens industrial"),
    ("pompe",                 "centrifugal pump grundfos industrial"),
    ("verin",                 "pneumatic cylinder festo"),
    ("filtre",                "industrial air filter"),
    ("accouplement",          "industrial grid coupling"),
    # Specific Industrial Parts (User Strategies)
    ("corps pompe",           "pump casing housing"),
    ("corps",                 "mechanical machine body casing"),
    ("axe",                   "steel shaft axle mechanical"),
    ("cuve",                  "industrial storage tank stainless steel"),
    ("chauffage",             "industrial heating element"),
    ("turbo",                 "industrial blower turbocharger"),
    ("resistance",            "industrial heating element"),
    ("regulateur",            "industrial temperature controller"),
    ("ventilation",           "industrial axial fan"),
    ("agitation",             "industrial agitator mixer"),
    ("capteur",               "industrial sensor festo"),
    ("sonde",                 "industrial sensor probe"),
    ("thermostat",            "industrial thermostat"),
    ("melangeur",             "industrial mixer agitator"),
    ("doseur",                "industrial dosing pump"),
    ("robinet",               "industrial valve handle"),
    ("manometre",             "industrial pressure gauge"),
    ("pressostat",            "industrial pressure switch"),
    ("tremie",                "industrial hopper bin"),
    ("aspirateur",            "industrial vacuum cleaner"),
    ("turbine",               "industrial turbine impeller"),
    ("flexible",              "industrial hydraulic hose"),
    ("tuyau",                 "industrial pipe tube"),
    ("vidange",               "industrial drain valve"),
]

MAX_IMAGE_BYTES = 300_000  # 300 KB cap before resize
THUMB_WIDTH     = 256      # px — taille officielle autorisée par Wikimedia


def _normalize(text: str) -> str:
    import unicodedata
    return ''.join(
        c for c in unicodedata.normalize('NFD', text.lower())
        if unicodedata.category(c) != 'Mn'
    )


def _generate_placeholder_b64(part_name: str) -> str:
    """Génère un placeholder professionnel en Base64 (Arial Bold + Couleurs déterministes)."""
    try:
        from PIL import Image, ImageDraw, ImageFont
        
        # Couleur déterministe basée sur le nom
        h = int(hashlib.md5(_normalize(part_name).encode()).hexdigest()[:6], 16)
        hue = (h % 360) / 360.0
        r1, g1, b1 = colorsys.hsv_to_rgb(hue, 0.65, 0.28)
        r2, g2, b2 = colorsys.hsv_to_rgb((hue + 0.04) % 1, 0.55, 0.48)

        dark   = (int(r1 * 255), int(g1 * 255), int(b1 * 255))
        accent = (int(r2 * 255), int(g2 * 255), int(b2 * 255))
        white  = (240, 240, 255)

        img = Image.new('RGB', (256, 256), dark)
        draw = ImageDraw.Draw(img)

        # Bandes accent haut/bas
        draw.rectangle([0, 0, 256, 40], fill=accent)
        draw.rectangle([0, 216, 256, 256], fill=accent)

        # Cercle central décoratif
        draw.ellipse([60, 50, 196, 186], outline=accent, width=5)
        draw.ellipse([75, 65, 181, 171], outline=white, width=2)

        # Initiales en grand
        initials = ''.join(w[0] for w in part_name.split() if w)[:3].upper()
        font = None
        for font_path in [
            "C:/Windows/Fonts/arialbd.ttf",
            "C:/Windows/Fonts/arial.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        ]:
            if os.path.exists(font_path):
                try:
                    font = ImageFont.truetype(font_path, size=50)
                    break
                except Exception:
                    pass

        if font:
            draw.text((128, 118), initials, font=font, fill=white, anchor="mm")
        else:
            draw.text((100, 110), initials, fill=white)

        buf = BytesIO()
        img.save(buf, format="JPEG", quality=85)
        b64 = base64.b64encode(buf.getvalue()).decode("ascii")
        return f"data:image/jpeg;base64,{b64}"
    except Exception:
        # Ultra-fallback
        return ""


def _build_query(part_name: str, category: Optional[str] = None) -> str:
    """
    Cleans the name and builds a technical English search term.
    Uses category if provided for context injection.
    """
    low = _normalize(part_name)
    
    # 1. Start with the cleaned part name
    query_term = part_name
    
    # 2. Context Injection (Category strategy)
    context = ""
    if category:
        cat = category.lower()
        if "hydraul" in cat: context = "hydraulic "
        elif "pneuma" in cat: context = "pneumatic "
        elif "electr" in cat: context = "electric "
        elif "mecani" in cat: context = "mechanical "

    # 3. Apply dictionary mapping
    for fr, en in _FR_TO_EN:
        if fr.lower() in low:
            query_term = context + en
            break

    # Strategy: Contextual substitution for dangerous terms
    if query_term.lower() == "body":
        query_term = f"{context}machine casing body"
    if query_term.lower() == "adapter":
        query_term = f"{context}adapter fitting"

    return query_term


async def _search_commons(query: str, client: httpx.AsyncClient) -> Optional[str]:
    """Search Wikimedia Commons. Returns thumbnail URL or None."""
    # Safety keywords to force mechanical domain and exclude humans/military
    SAFETY_KEYWORDS = "spare part mechanical industrial -human -person -portrait -military -soldier -face -people"
    
    # Progressive search attempts for "Catalog/Studio" style
    search_attempts = [
        f"{query} product photography isolated white background {SAFETY_KEYWORDS}",
        f"\"{query}\" white background studio {SAFETY_KEYWORDS}",
        f"{query} 3D render isolated {SAFETY_KEYWORDS}",
        f"{query} catalog photography {SAFETY_KEYWORDS}",
    ]

    for i, attempt in enumerate(search_attempts):
        logger.info("   📖 [Stage %d] Search: %r", i+1, attempt)
        params = {
            "action":       "query",
            "format":       "json",
            "generator":    "search",
            "gsrnamespace": "6",
            "gsrsearch":    f"filetype:bitmap {attempt}",
            "gsrlimit":     "15",
            "prop":         "imageinfo",
            "iiprop":       "url|mime",
            "iiurlwidth":   str(THUMB_WIDTH),
        }
        try:
            resp = await client.get(
                "https://commons.wikimedia.org/w/api.php",
                params=params,
                timeout=10,
            )
            if resp.status_code == 429:
                logger.warning("   ⚠️ Wikimedia Rate Limit (429). Waiting 2s...")
                await asyncio.sleep(2)
                continue
            
            resp.raise_for_status()
            data = resp.json()
            pages = data.get("query", {}).get("pages", {})
            
            # Filename-based filtering (Reject if title contains person/military keywords)
            forbidden = ["portrait", "person", "soldier", "military", "army", "human", "face", "people", "man", "woman", "diagram", "chart"]
            
            candidates = []
            for page in pages.values():
                ii = page.get("imageinfo", [{}])[0]
                url = ii.get("thumburl") or ii.get("url")
                title = page.get("title", "").lower()
                
                # Check for forbidden keywords in the filename/title
                if not url or any(f in title for f in forbidden):
                    if url: logger.debug("   🚫 Title rejected: %s", title[:40])
                    continue
                
                # Scoring
                score = 0
                if "white" in title: score += 5
                if "product" in title: score += 3
                if "isolated" in title: score += 3
                if "industrial" in title: score += 1
                
                candidates.append((score, url, title))
            
            if candidates:
                # Sort by score descending
                candidates.sort(key=lambda x: x[0], reverse=True)
                best_url = candidates[0][1]
                best_title = candidates[0][2]
                logger.info("   ✅ Found candidate: %s (Score: %s)", best_title[:50], candidates[0][0])
                return best_url
                
        except Exception as exc:
            logger.debug("   ❌ Attempt %d failed: %s", i+1, exc)
            
    return None


def _is_industrial_style(image_bytes: bytes) -> bool:
    """
    Visual Validation Heuristic:
    Checks if the image has a bright background (white/light grey)
    and low saturation (typical of metallic/industrial parts).
    """
    try:
        img = Image.open(BytesIO(image_bytes)).convert("RGB")
        stat = ImageStat.Stat(img)
        
        # 1. Average brightness (0-255). White/Light Grey is > 180
        avg_brightness = sum(stat.mean) / 3
        
        # 2. Saturation/Colorfulness. 
        # Industrial parts are mostly achromatic (R approx G approx B).
        r, g, b = stat.mean
        color_variance = abs(r-g) + abs(g-b) + abs(b-r)
        
        logger.debug("   🔍 Visual Check: Brightness=%.1f, Variance=%.1f", avg_brightness, color_variance)
        
        # Rejection criteria:
        # - Too dark (not studio photography)
        # - Too colorful (likely a person, a landscape, or a non-industrial scene)
        if avg_brightness < 120:
            return False
        if color_variance > 70: # A human face or military uniform has high color variance
            return False
            
        return True
    except Exception as e:
        logger.error("   ❌ Visual check failed: %s", e)
        return True # Default to True if we can't check

async def _download_image(url: str, client: httpx.AsyncClient, validate: bool = True) -> Optional[bytes]:
    """Download image bytes, resize to 256px if too large, and validate style."""
    try:
        resp = await client.get(url, timeout=15, follow_redirects=True)
        resp.raise_for_status()
        content = resp.content

        # Visual Validation BEFORE processing (only if requested)
        if validate and not _is_industrial_style(content):
            logger.warning("   ⚠️ Image rejected by Visual Validation")
            return None

        # Always resize to keep base64 small
        try:
            img = Image.open(BytesIO(content))
            
            # Convert to RGB if needed
            if img.mode in ("RGBA", "P"):
                img = img.convert("RGB")

            # Resize keeping aspect ratio
            img.thumbnail((256, 256), ImageResampling.LANCZOS)
            
            out = BytesIO()
            img.save(out, format="JPEG", quality=85, optimize=True)
            final_bytes = out.getvalue()
            
            if len(final_bytes) < 100:
                logger.warning("Resized image too small (%d bytes), fallback", len(final_bytes))
                return None
                
            return final_bytes
        except Exception as e:
            logger.error("Error processing image: %s", e)
            if len(content) > MAX_IMAGE_BYTES:
                content = content[:MAX_IMAGE_BYTES]
            return content
    except Exception as exc:
        logger.debug("Image download error %s: %s", url, exc)
    return None


async def get_part_image_b64(part_name: str, category: Optional[str] = None) -> Optional[str]:
    """
    Main entry point.
    Returns a base64 data-URI like "data:image/jpeg;base64,/9j/4AAQ..."
    or a generated placeholder if nothing found.
    """
    import base64
    try:
        query = _build_query(part_name, category)
        logger.info("🖼️ Processing Part: %r (Query: %r, Cat: %r)", part_name, query, category)

        async with httpx.AsyncClient(
            headers={"User-Agent": "GMAO-PFE/2.0 (https://github.com/pfe-gmao; contact: pfe.gmao.industrial@gmail.com) educational usage"}
        ) as client:
            url = await _search_commons(query, client)

            if not url:
                # Last resort fallback 1: try the original name as-is
                if query.lower() != part_name.lower():
                    logger.info("   🔍 Retrying with original name: %r", part_name)
                    url = await _search_commons(part_name, client)

            if not url and category:
                # Last resort fallback 2: (USER STRATEGY) try the category alone
                logger.info("   🔍 Fallback search using Category: %r", category)
                url = await _search_commons(f"industrial {category}", client)

            if not url:
                logger.warning("   ⚠️ No image found for %r after all attempts.", part_name)
                return _generate_placeholder_b64(part_name)

            image_bytes = await _download_image(url, client)
            
            # If rejected by visual check, try ONE broad search without strict "white background"
            if not image_bytes:
                logger.info("   🔍 Last resort: broad search for %r", query)
                url = await _search_commons(query, client, strict=False)
                if url:
                    image_bytes = await _download_image(url, client, validate=False)

            if not image_bytes:
                logger.warning("   ↩️ Failed to find a suitable industrial image for %r.", part_name)
                return _generate_placeholder_b64(part_name)

            b64 = base64.b64encode(image_bytes).decode("ascii")
            data_uri = f"data:image/jpeg;base64,{b64}"
            logger.info("✅ %r → %d bytes → %d b64 chars", part_name, len(image_bytes), len(data_uri))
            return data_uri
    except Exception as e:
        logger.error("Error in get_part_image_b64: %s", e)
        return _generate_placeholder_b64(part_name)
