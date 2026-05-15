"""
ddg_image_service.py
Fetches clean, industrial images from DuckDuckGo without any API key.
Uses advanced technical English queries to ensure quality.
"""

import os
import base64
import logging
import re
import unicodedata
import time
from io import BytesIO
from typing import Optional

import httpx
from PIL import Image
from duckduckgo_search import DDGS

logger = logging.getLogger(__name__)

# ── FR → EN Dictionary (Expanded for precision) ──────────────────────────────
_FR_TO_EN: list[tuple[str, str]] = [
    ("vis à métaux",          "machine screw"),
    ("vis sans fin",          "worm gear"),
    ("vis",                   "industrial screw bolt"),
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
    # Strip catalogue codes
    low = re.sub(r'\b[A-Z][A-Z0-9]{2,}\b', '', low)
    low = re.sub(r'\s+', ' ', low).strip()

    for fr, en in _FR_TO_EN:
        if _normalize(fr) in low:
            return en
    return low or part_name

async def _download_and_resize(url: str, client: httpx.AsyncClient) -> Optional[bytes]:
    try:
        resp = await client.get(url, timeout=10, follow_redirects=True)
        resp.raise_for_status()
        
        img = Image.open(BytesIO(resp.content))
        if img.mode in ("RGBA", "P"):
            bg = Image.new("RGB", img.size, (255, 255, 255))
            if img.mode == "RGBA":
                bg.paste(img, mask=img.split()[3])
            else:
                bg.paste(img.convert("RGB"))
            img = bg
        else:
            img = img.convert("RGB")

        img.thumbnail((256, 256), Image.LANCZOS)
        out = BytesIO()
        img.save(out, format="JPEG", quality=85)
        return out.getvalue()
    except Exception as e:
        logger.debug("   ❌ Download error for %s: %s", url, e)
        return None

async def get_part_image_b64(part_name: str, category: Optional[str] = None) -> Optional[str]:
    """
    Main entry point for DuckDuckGo image search.
    No API key needed. Highly optimized for industrial results.
    """
    try:
        en_query = _build_query(part_name)
        # Advanced query to force white background and industrial context
        full_query = f"{en_query} industrial product photography white background isolated"
        
        logger.info("🦆 [DDG Search] Part: %r -> Query: %r", part_name, full_query)

        with DDGS() as ddgs:
            results = list(ddgs.images(
                full_query,
                region="wt-wt",
                safesearch="on",
                size="Small",
                type_image="photo",
                max_results=5
            ))

        if not results:
            # Fallback with category
            if category:
                logger.info("   🔍 DDG Fallback with category: %r", category)
                with DDGS() as ddgs:
                    results = list(ddgs.images(f"{category} industrial component white background", max_results=3))
            
            if not results:
                return None

        async with httpx.AsyncClient(headers={"User-Agent": "Mozilla/5.0"}) as client:
            for res in results:
                url = res.get("image")
                if not url: continue
                
                logger.info("   ✅ DDG Candidate: %s", res.get("title", "")[:50])
                img_bytes = await _download_and_resize(url, client)
                if img_bytes:
                    b64 = base64.b64encode(img_bytes).decode("ascii")
                    return f"data:image/jpeg;base64,{b64}"

        return None
    except Exception as e:
        logger.error("❌ DDG Service Error: %s", e)
        return None
