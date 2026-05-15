"""
serpapi_image_service.py
Uses Google Images via SerpApi for high-quality industrial parts imagery.
"""

import os
import base64
import logging
import re
import unicodedata
from io import BytesIO
from typing import Optional

import httpx
from PIL import Image
from serpapi import GoogleSearch

logger = logging.getLogger(__name__)

# Ta clé SerpApi
SERPAPI_KEY = "2139cff42c62bc28a7551ba18958610ea66636c1e6156a08e27bd21c251dc843"

_FR_TO_EN: list[tuple[str, str]] = [
    ("vis à métaux",          "machine screw"),
    ("vis sans fin",          "worm gear"),
    ("vis",                   "screw bolt"),
    ("écrou",                 "hex nut"),
    ("boulon",                "industrial bolt"),
    ("roulement à billes",    "ball bearing"),
    ("roulement",             "industrial ball bearing"),
    ("courroie",              "industrial drive belt"),
    ("poulie",                "mechanical pulley"),
    ("engrenage",             "gear wheel metal"),
    ("accouplement",          "shaft coupling industrial"),
    ("réducteur",             "gearbox reducer"),
    ("arbre",                 "industrial drive shaft"),
    ("joint torique",         "o-ring seal"),
    ("joint",                 "mechanical seal"),
    ("vérin hydraulique",     "hydraulic cylinder"),
    ("vérin pneumatique",     "pneumatic cylinder"),
    ("vérin",                 "industrial cylinder actuator"),
    ("pompe hydraulique",     "hydraulic pump"),
    ("pompe",                 "industrial centrifugal pump"),
    ("vanne",                 "industrial ball valve"),
    ("robinet",               "industrial valve"),
    ("clapet",                "check valve industrial"),
    ("flexible",              "hydraulic hose pipe"),
    ("tuyau",                 "industrial steel pipe"),
    ("contacteur",            "electrical contactor"),
    ("relais",                "electrical relay"),
    ("disjoncteur",           "circuit breaker"),
    ("capteur",               "industrial proximity sensor"),
    ("sonde",                 "industrial sensor probe"),
    ("moteur électrique",     "electric motor industrial"),
    ("moteur",                "electric motor"),
    ("turbine",               "industrial blower turbine"),
    ("filtre air",            "air filter industrial"),
    ("filtre",                "industrial filter"),
    ("trémie",                "industrial hopper bin"),
    ("aspirateur",            "industrial vacuum cleaner"),
    ("vidange",               "drain valve"),
]

def _normalize(text: str) -> str:
    return ''.join(
        c for c in unicodedata.normalize('NFD', text.lower())
        if unicodedata.category(c) != 'Mn'
    )

def _build_query(part_name: str) -> str:
    low = _normalize(part_name)
    low = re.sub(r'\b[A-Z][A-Z0-9]{2,}\b', '', low)
    low = re.sub(r'\s+', ' ', low).strip()

    for fr, en in _FR_TO_EN:
        if _normalize(fr) in low:
            return en
    return low or part_name

async def _download_and_resize(url: str) -> Optional[bytes]:
    try:
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            
            img = Image.open(BytesIO(resp.content))
            img = img.convert("RGB")
            img.thumbnail((256, 256), Image.LANCZOS)
            
            out = BytesIO()
            img.save(out, format="JPEG", quality=90)
            return out.getvalue()
    except Exception as e:
        logger.debug("   ❌ Error downloading %s: %s", url, e)
        return None

async def get_part_image_b64(part_name: str, category: Optional[str] = None) -> Optional[str]:
    """
    Main entry point using SerpApi (Google Images).
    """
    try:
        en_query = _build_query(part_name)
        
        # Désambiguïsation sémantique
        context = category if category else "industrial spare part"
        
        # Requête optimisée avec mots-clés négatifs pour éviter le matériel militaire/jouets
        negative_keywords = "-military -army -soldier -toy -war -vintage"
        search_query = f"{en_query} {context} product white background {negative_keywords}"
        
        logger.info("🔍 [SerpApi Google] Part: %r (Cat: %r) -> Query: %r", part_name, category, search_query)

        params = {
            "engine": "google_images",
            "q": search_query,
            "api_key": SERPAPI_KEY,
            "num": 5,
            "ijn": "0",
            "chips": "q:industrial,online_chip:spare+part" # Force le contexte industriel via Google Chips
        }

        # On utilise search() de manière synchrone car SerpApi est rapide
        search = GoogleSearch(params)
        results = search.get_dict()
        
        images = results.get("images_results", [])
        if not images:
            logger.warning("   ⚠️ No images found on Google for %r", part_name)
            return None

        # On essaie les 3 premières images jusqu'à ce qu'un téléchargement réussisse
        for i in range(min(3, len(images))):
            img_url = images[i].get("thumbnail") or images[i].get("original")
            if not img_url: continue
            
            logger.info("   ✅ Google Image found: %s", images[i].get("title", "")[:50])
            img_bytes = await _download_and_resize(img_url)
            if img_bytes:
                b64 = base64.b64encode(img_bytes).decode("ascii")
                return f"data:image/jpeg;base64,{b64}"

        return None
    except Exception as e:
        logger.error("❌ SerpApi Service Error: %s", e)
        return None
