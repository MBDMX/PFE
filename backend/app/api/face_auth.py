from fastapi import APIRouter, Depends, HTTPException, status
import json
import math
from typing import List, Optional

from prisma import Prisma
from app.db.session import get_db
from app.api.auth import make_token_data
from app.core.security import create_access_token, create_refresh_token
from pydantic import BaseModel

from app.api.deps import get_current_user

router = APIRouter()

LOG_FILE = "face_debug_log.txt"

def log(msg: str):
    """Write a log message to the debug file using UTF-8 to avoid Windows encoding errors."""
    try:
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(msg + "\n")
    except Exception:
        pass  # Never let logging crash the app


class FaceDescriptorSchema(BaseModel):
    descriptor: List[float]

class FaceEnrollSchema(BaseModel):
    """Supports enrolling multiple descriptors (5 samples) for better accuracy."""
    descriptors: List[List[float]]  # List of 128-float vectors


def euclidean_distance(v1: List[float], v2: List[float]) -> float:
    if len(v1) != len(v2):
        return 1.0
    return math.sqrt(sum((a - b) ** 2 for a, b in zip(v1, v2)))


def best_distance_against_stored(candidate: List[float], stored_json: str) -> float:
    """
    Compare candidate against stored descriptor(s).
    Stored can be either:
      - A single descriptor: [0.1, 0.2, ...]         (legacy)
      - Multiple descriptors: [[0.1, ...], [0.2, ...]] (new multi-sample)
    Returns the MINIMUM distance found (best match).
    """
    stored = json.loads(stored_json)

    # Detect format: list of floats = single descriptor
    if stored and isinstance(stored[0], float):
        return euclidean_distance(candidate, stored)

    # List of lists = multiple descriptors → take best match
    distances = [euclidean_distance(candidate, desc) for desc in stored if isinstance(desc, list)]
    return min(distances) if distances else 1.0


@router.post("/face/enroll")
async def enroll_face(
    data: FaceDescriptorSchema,
    db: Prisma = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    LEGACY single-descriptor enrollment. Kept for backward compatibility.
    Prefer /face/enroll-multi for better stability.
    """
    await db.user.update(
        where={"id": current_user.id},
        data={"face_descriptor": json.dumps(data.descriptor)},
    )
    log(f"[ENROLL] Single descriptor saved for user {current_user.username}")
    return {"message": "Visage enregistré avec succès (1 sample)"}


@router.post("/face/enroll-multi")
async def enroll_face_multi(
    data: FaceEnrollSchema,
    db: Prisma = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Enrolls multiple face samples (recommended: 5 samples).
    Stores as a list of descriptors → better stability across lighting/angle changes.
    """
    if len(data.descriptors) < 1:
        raise HTTPException(status_code=400, detail="Au moins 1 descripteur requis")

    log(f"[ENROLL-MULTI] {len(data.descriptors)} samples saved for user {current_user.username}")
    await db.user.update(
        where={"id": current_user.id},
        data={"face_descriptor": json.dumps(data.descriptors)},
    )
    return {"message": f"Visage enregistré avec {len(data.descriptors)} échantillon(s)"}


@router.post("/face/login")
async def face_login(data: FaceDescriptorSchema):
    """
    Finds a user whose stored descriptor(s) match the input.
    
    Security thresholds (strict):
      - THRESHOLD = 0.50  → Must be closer than 0.50 to match
      - MIN_GAP   = 0.10  → The best match must be at least 0.10 better than 2nd best
                            (prevents false positives when two faces are similar)
    """
    from app.db.session import prisma as db

    # --- Strict thresholds ---
    THRESHOLD = 0.50   # Was 0.65 — reduced to avoid cross-user matches
    MIN_GAP   = 0.10   # Minimum margin between best and 2nd best match

    try:
        log("[FACE LOGIN] Request received")

        # --- 1. Fetch all users with a face profile ---
        all_users = await db.user.find_many()
        users_with_face = [u for u in all_users if getattr(u, "face_descriptor", None)]
        log(f"[FACE LOGIN] {len(users_with_face)} user(s) with face profile")

        if not users_with_face:
            raise HTTPException(status_code=401, detail="Aucun profil facial enregistré")

        # --- 2. Compute distances for ALL users ---
        results = []
        for user in users_with_face:
            try:
                dist = best_distance_against_stored(data.descriptor, user.face_descriptor)
                log(f"[FACE LOGIN] {user.username}: dist={dist:.4f}")
                results.append((dist, user))
            except Exception as loop_err:
                log(f"[FACE LOGIN] Loop error for {user.username}: {str(loop_err)}")
                continue

        if not results:
            raise HTTPException(status_code=401, detail="Visage non reconnu")

        # Sort by distance ascending (best match first)
        results.sort(key=lambda x: x[0])
        best_dist, best_match = results[0]

        # --- 3. Strict threshold check ---
        if best_dist >= THRESHOLD:
            log(f"[FACE LOGIN] REJECTED — best dist={best_dist:.4f} >= threshold={THRESHOLD}")
            raise HTTPException(status_code=401, detail="Visage non reconnu")

        # --- 4. Anti-confusion check (MIN_GAP) ---
        # If there's a 2nd candidate and it's too close to the best → reject to avoid confusion
        if len(results) >= 2:
            second_dist = results[1][0]
            gap = second_dist - best_dist
            log(f"[FACE LOGIN] 2nd best: {results[1][1].username} dist={second_dist:.4f}, gap={gap:.4f}")
            if gap < MIN_GAP:
                log(f"[FACE LOGIN] REJECTED — gap={gap:.4f} < MIN_GAP={MIN_GAP} (ambiguous match)")
                raise HTTPException(
                    status_code=401,
                    detail="Identification ambiguë — veuillez repositionner votre visage"
                )

        # --- 5. Success ---
        log(f"[FACE LOGIN] MATCH: {best_match.username} (dist={best_dist:.4f})")
        token_data = make_token_data(best_match)
        return {
            "access_token":  create_access_token(data=token_data),
            "refresh_token": create_refresh_token(data=token_data),
            "token_type":    "bearer",
            "user": {
                "id":       best_match.id,
                "username": best_match.username,
                "role":     best_match.role,
                "name":     best_match.name,
            },
        }

    except Exception as e:
        import traceback
        log(f"[FACE LOGIN] CRITICAL ERROR: {str(e)}\n{traceback.format_exc()}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------------
# FAST PATH — Client-side matching
# ---------------------------------------------------------------------------

@router.get("/face/descriptors")
async def get_face_descriptors(db: Prisma = Depends(get_db)):
    """
    Returns all face profiles so the frontend can do matching locally
    with face-api.js FaceMatcher (zero network calls per frame).
    Only returns id, username, role, name and the descriptor(s).
    Called ONCE when the scanner opens.
    """
    users = await db.user.find_many()
    profiles = []
    for u in users:
        if not getattr(u, "face_descriptor", None):
            continue
        try:
            raw = json.loads(u.face_descriptor)
            # Normalise to always be a list-of-lists
            if raw and isinstance(raw[0], float):
                descriptors = [raw]          # single → wrap in list
            else:
                descriptors = raw            # already multi-sample
            profiles.append({
                "id":          u.id,
                "username":    u.username,
                "role":        u.role,
                "name":        u.name or u.username,
                "descriptors": descriptors,
            })
        except Exception as e:
            log(f"[DESCRIPTORS] Error parsing {u.username}: {e}")
            continue
    log(f"[DESCRIPTORS] Served {len(profiles)} profile(s)")
    return profiles


class FaceTokenRequest(BaseModel):
    """Frontend sends this after a successful LOCAL match."""
    user_id:    int
    descriptor: List[float]   # Re-verified server-side for security


@router.post("/face/token")
async def get_face_token(data: FaceTokenRequest, db: Prisma = Depends(get_db)):
    """
    Fast token endpoint called ONCE after the frontend locally confirmed a match.
    Re-verifies the descriptor server-side before issuing tokens (security).
    Threshold is slightly relaxed (0.55) because we already know which user.
    """
    THRESHOLD = 0.55

    user = await db.user.find_unique(where={"id": data.user_id})
    if not user or not getattr(user, "face_descriptor", None):
        raise HTTPException(status_code=404, detail="Utilisateur ou profil facial introuvable")

    dist = best_distance_against_stored(data.descriptor, user.face_descriptor)
    log(f"[FACE TOKEN] Re-verify {user.username}: dist={dist:.4f}")

    if dist >= THRESHOLD:
        log(f"[FACE TOKEN] REJECTED — dist={dist:.4f} >= {THRESHOLD}")
        raise HTTPException(status_code=401, detail="Vérification serveur échouée")

    log(f"[FACE TOKEN] OK — issuing tokens for {user.username}")
    token_data = make_token_data(user)
    return {
        "access_token":  create_access_token(data=token_data),
        "refresh_token": create_refresh_token(data=token_data),
        "token_type":    "bearer",
        "user": {
            "id":       user.id,
            "username": user.username,
            "role":     user.role,
            "name":     user.name,
        },
    }

