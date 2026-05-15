"""
bing_image_service.py
Fetches a clean, white-background product image from Bing Image Search API.

Flow:
  1. Build a search query from the French part name (FR→EN mapping)
  2. Call Bing Image Search API with color=White filter
  3. Download the first result
  4. Resize to 256px and return as base64 data-URI

Requirements:
  - Set BING_API_KEY in your .env file
  - pip install httpx pillow python-dotenv
"""

import os
import base64
import logging
import re
import unicodedata
from io import BytesIO
from typing import Optional

import httpx
from PIL import Image, ImageResampling

logger = logging.getLogger(__name__)

BING_API_KEY = os.getenv("BING_API_KEY", "")
BING_ENDPOINT = "https://api.bing.microsoft.com/v7.0/images/search"

# ── FR → EN Dictionary (clean & simple) ──────────────────────────────────────
_FR_TO_EN: list[tuple[str, str]] = [
    # Fasteners
    ("vis à métaux",          "machine screw"),
    ("vis sans fin",          "worm gear"),
    ("vis doseuse",           "dosing screw conveyor"),
    ("vis extrusion",         "extrusion screw"),
    ("vis",                   "screw bolt"),
    ("écrou",                 "hex nut"),
    ("boulon",                "bolt"),
    # Bearings / transmission
    ("roulement à billes",    "ball bearing SKF"),
    ("roulement à rouleaux",  "roller bearing"),
    ("roulement",             "ball bearing"),
    ("courroie trapézoïdale", "v-belt"),
    ("courroie",              "drive belt"),
    ("poulie",                "pulley"),
    ("engrenage",             "gear wheel"),
    ("chaîne",                "roller chain"),
    ("accouplement",          "shaft coupling"),
    ("réducteur",             "gearbox reducer"),
    ("reducteur",             "gearbox reducer"),
    ("arbre agitateur",       "agitator shaft"),
    ("arbre mélange",         "mixing shaft"),
    ("arbre",                 "drive shaft"),
    ("palier",                "bearing housing"),
    ("moyeu",                 "shaft hub"),
    ("pignon",                "sprocket gear"),
    ("encodeur",              "rotary encoder"),
    ("variateur",             "variable frequency drive VFD"),
    # Seals / gaskets
    ("joint torique",         "o-ring seal"),
    ("joint plat",            "flat gasket"),
    ("joint spi",             "oil seal lip"),
    ("joint",                 "mechanical seal"),
    # Hydraulic / pneumatic
    ("vérin hydraulique",     "hydraulic cylinder"),
    ("vérin pneumatique",     "pneumatic cylinder Festo"),
    ("vérin",                 "hydraulic cylinder"),
    ("verin",                 "hydraulic cylinder"),
    ("pompe hydraulique",     "hydraulic pump"),
    ("pompe centrifuge",      "centrifugal pump Grundfos"),
    ("pompe",                 "industrial pump"),
    ("corps pompe",           "pump casing housing"),
    ("corps",                 "valve body housing"),
    ("vanne matière",         "industrial gate valve"),
    ("vanne sortie",          "outlet gate valve"),
    ("vanne",                 "industrial ball valve"),
    ("robinet",               "industrial valve"),
    ("clapet",                "check valve"),
    ("flexible",              "hydraulic hose"),
    ("tuyau",                 "industrial steel pipe"),
    ("tuyaux",                "industrial steel pipe"),
    ("conduite",              "industrial pipeline"),
    ("bride",                 "pipe flange"),
    ("adaptateur",            "hydraulic adapter fitting"),
    # Electrical
    ("contacteur",            "electrical contactor Schneider"),
    ("relais thermique",      "thermal relay"),
    ("relais",                "electrical relay"),
    ("fusible",               "electrical fuse"),
    ("disjoncteur",           "circuit breaker"),
    ("câble",                 "electrical cable"),
    ("cable",                 "electrical cable"),
    # Sensors & measurement
    ("capteur inductif",      "inductive proximity sensor"),
    ("capteur niveau",        "level sensor"),
    ("capteur position",      "position sensor"),
    ("capteur",               "industrial sensor"),
    ("sonde température",     "temperature sensor PT100"),
    ("sonde",                 "industrial probe sensor"),
    ("thermocouple",          "thermocouple sensor"),
    ("thermostat",            "industrial thermostat"),
    ("manometre",             "pressure gauge"),
    ("pressostat",            "pressure switch"),
    # Heating
    ("résistances chauffage", "electric heating element"),
    ("résistances",           "electric heating element"),
    ("résistance",            "electric heating element"),
    ("chauffage",             "industrial heater"),
    # Motors / rotation
    ("moteur agitateur",      "electric motor industrial"),
    ("moteur doseur",         "electric motor"),
    ("moteur électrique",     "electric motor Siemens"),
    ("moteur principal",      "electric motor"),
    ("moteur",                "electric motor"),
    ("motorisation",          "electric motor drive"),
    # Industrial equipment
    ("turbine aspiration",    "centrifugal fan blower"),
    ("turbosoufflante",       "turbo blower industrial"),
    ("turbo",                 "industrial blower"),
    ("turbine",               "industrial turbine"),
    ("ventilateur",           "centrifugal fan"),
    ("ventilation",           "industrial fan"),
    ("compresseur",           "air compressor"),
    ("filtre matière",        "industrial filter"),
    ("filtre à huile",        "oil filter"),
    ("filtre air",            "air filter industrial"),
    ("filtre",                "industrial filter"),
    ("couvercle",             "industrial cover lid"),
    ("réservoir",             "industrial tank"),
    ("surpresseur",           "pressure booster"),
    ("tamis",                 "industrial sieve"),
    ("pale",                  "impeller blade"),
    ("pales",                 "mixer blades impeller"),
    ("agitation cristalisateur", "agitator mixer industrial"),
    ("agitation",             "industrial agitator"),
    ("cuve cristalisateur",   "crystallizer tank stainless steel"),
    ("cuve",                  "industrial tank stainless steel"),
    ("tremie",                "industrial hopper"),
    ("trémie",                "industrial hopper"),
    ("aspirateur",            "industrial vacuum"),
    ("vidange",               "drain valve"),
    ("melangeur",             "industrial mixer"),
    ("doseur",                "dosing pump"),
    ("aimant",                "industrial magnet"),
    ("axe",                   "steel shaft axle"),
    ("support",               "industrial mounting bracket"),
    ("palier",                "bearing housing"),
]


def _normalize(text: str) -> str:
    """Remove accents and lowercase."""
    return ''.join(
        c for c in unicodedata.normalize('NFD', text.lower())
        if unicodedata.category(c) != 'Mn'
    )


def _build_query(part_name: str) -> str:
    """Map French part name to English technical search query."""
    low = _normalize(part_name)
    # Strip catalogue codes (ex: EX0202EDV0601)
    low = re.sub(r'\b[A-Z][A-Z0-9]{2,}\b', '', low)
    low = re.sub(r'\s+', ' ', low).strip()

    for fr, en in _FR_TO_EN:
        if _normalize(fr) in low:
            return en

    # Fallback: use the cleaned name as-is (Bing is smart enough)
    return low or part_name


async def _search_bing(query: str, client: httpx.AsyncClient) -> Optional[str]:
    """
    Call Bing Image Search API.
    Returns the URL of the best matching image, or None.
    """
    if not BING_API_KEY:
        logger.error("❌ BING_API_KEY not set in .env!")
        return None

    # Search query: English term + "spare part" context
    full_query = f"{query} spare part white background"

    params = {
        "q":          full_query,
        "count":      "10",
        "imageType":  "Photo",
        "color":      "White",       # 🔑 KEY: Forces white-background images
        "size":       "Small",
        "safeSearch": "Strict",
    }
    headers = {
        "Ocp-Apim-Subscription-Key": BING_API_KEY,
    }

    try:
        resp = await client.get(BING_ENDPOINT, params=params, headers=headers, timeout=10)
        resp.raise_for_status()
        data = resp.json()

        results = data.get("value", [])
        if not results:
            logger.warning("   ⚠️ Bing: No results for %r", full_query)
            return None

        # Take the first result (Bing already ranks by relevance)
        best = results[0]
        url = best.get("thumbnailUrl") or best.get("contentUrl")
        logger.info("   ✅ Bing found: %s", best.get("name", "")[:60])
        return url

    except Exception as e:
        logger.error("   ❌ Bing search error: %s", e)
        return None


async def _download_and_resize(url: str, client: httpx.AsyncClient) -> Optional[bytes]:
    """Download image, convert to JPEG 256px."""
    try:
        resp = await client.get(url, timeout=15, follow_redirects=True)
        resp.raise_for_status()
        content = resp.content

        img = Image.open(BytesIO(content))
        if img.mode in ("RGBA", "P", "LA"):
            # Paste on white background for transparency
            bg = Image.new("RGB", img.size, (255, 255, 255))
            if img.mode == "RGBA":
                bg.paste(img, mask=img.split()[3])
            else:
                bg.paste(img.convert("RGB"))
            img = bg
        else:
            img = img.convert("RGB")

        img.thumbnail((256, 256), ImageResampling.LANCZOS)

        out = BytesIO()
        img.save(out, format="JPEG", quality=88, optimize=True)
        return out.getvalue()

    except Exception as e:
        logger.error("   ❌ Download error: %s", e)
        return None


async def get_part_image_b64(part_name: str, category: Optional[str] = None) -> Optional[str]:
    """
    Main entry point.
    Returns "data:image/jpeg;base64,..." or None on failure.
    """
    query = _build_query(part_name)
    logger.info("🖼️  [Bing] Part: %r → Query: %r", part_name, query)

    async with httpx.AsyncClient(
        headers={"User-Agent": "GMAO-PFE/2.0 Industrial App"}
    ) as client:

        # Attempt 1: Translated English query
        url = await _search_bing(query, client)

        # Attempt 2: If no result, try with category context
        if not url and category:
            fallback_query = f"{category} industrial component"
            logger.info("   🔍 Fallback with category: %r", fallback_query)
            url = await _search_bing(fallback_query, client)

        if not url:
            logger.warning("   ⚠️ No image found for %r", part_name)
            return None

        image_bytes = await _download_and_resize(url, client)
        if not image_bytes:
            return None

        b64 = base64.b64encode(image_bytes).decode("ascii")
        data_uri = f"data:image/jpeg;base64,{b64}"
        logger.info("   ✅ Done: %r → %d bytes", part_name, len(image_bytes))
        return data_uri
