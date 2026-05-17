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

# pyrefly: ignore [missing-import]
import httpx
# pyrefly: ignore [missing-import]
from PIL import Image
# pyrefly: ignore [missing-import]
from serpapi import GoogleSearch

logger = logging.getLogger(__name__)

# Ta clé SerpApi (récupérée depuis le .env)
SERPAPI_KEY = os.getenv("SERPAPI_KEY", "")

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
    Main entry point using SerpApi (Google Images) with multi-stage fallback.
    """
    # Dictionnaire de boosts par catégorie (FR → termes de recherche EN précis)
    category_boosts = {
        "moteur":       "engine component",
        "électrique":   "automotive electrical",
        "filtration":   "filter automotive",
        "étanchéité":   "gasket seal",
        "visserie":     "bolt fastener",
        "transmission": "gearbox transmission",
        "freinage":     "brake component",
        "suspension":   "suspension part",
        "pompe":        "industrial pump",
        "roulement":    "ball bearing",
        "courroie":     "drive belt",
        "vanne":        "industrial valve",
    }
    
    # On cherche le boost le plus adapté à la catégorie de la pièce
    boost = "mechanical spare part"
    if category:
        for key, val in category_boosts.items():
            if key in (category or "").lower() or key in part_name.lower():
                boost = val
                break

    # Nettoyage du nom (on enlève les codes techniques type REF-123)
    clean_name = re.sub(r'[A-Z0-9]{3,}-\S*', '', part_name).strip()
    if not clean_name: clean_name = part_name

    en_query = _build_query(clean_name)
    
    # Mots-clés négatifs pour éviter les schémas et dessins
    negative = "-diagram -schema -cartoon -drawing -blueprint"
    
    # Stratégie de recherche en 3 étapes pour éviter les résultats vides
    search_attempts = [
        f"{en_query} {boost} OEM white background {negative}",  # Précis avec boost catégorie
        f"{en_query} industrial spare part {negative}",          # Moyen
        f"{boost} {negative}"                                    # Général (Fallback ultime)
    ]

    try:
        for attempt_query in search_attempts:
            logger.info("🔍 [SerpApi] Trying query: %r", attempt_query)
            
            params = {
                "engine": "google_images",
                "q": attempt_query,
                "api_key": SERPAPI_KEY,
                "num": 3,
                "ijn": "0",
                "tbs": "isz:m"   # Force images de taille moyenne minimum (meilleure qualité)
            }
            
            search = GoogleSearch(params)
            results = search.get_dict()
            images = results.get("images_results", [])
            
            if images:
                # On a trouvé quelque chose !
                for i in range(min(3, len(images))):
                    img_url = images[i].get("thumbnail") or images[i].get("original")
                    if not img_url: continue
                    
                    logger.info("   ✅ Image found (Query: %s): %s", attempt_query[:20], images[i].get("title", "")[:40])
                    img_bytes = await _download_and_resize(img_url)
                    if img_bytes:
                        b64 = base64.b64encode(img_bytes).decode("ascii")
                        return f"data:image/jpeg;base64,{b64}"
            
            logger.warning("   ⚠️ No results for %r, trying next fallback...", attempt_query)

        return None
    except Exception as e:
        logger.error("❌ SerpApi Service Error: %s", e)
        return None
