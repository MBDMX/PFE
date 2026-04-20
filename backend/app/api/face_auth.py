from fastapi import APIRouter, Depends, HTTPException, status
import json
import math
from typing import List

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


def euclidean_distance(v1: List[float], v2: List[float]) -> float:
    if len(v1) != len(v2):
        return 1.0
    return math.sqrt(sum((a - b) ** 2 for a, b in zip(v1, v2)))


@router.post("/face/enroll")
async def enroll_face(
    data: FaceDescriptorSchema,
    db: Prisma = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Saves the 128-float descriptor as a JSON string for the current user."""
    await db.user.update(
        where={"id": current_user.id},
        data={"face_descriptor": json.dumps(data.descriptor)},
    )
    return {"message": "Visage enregistré avec succès"}


@router.post("/face/login")
async def face_login(data: FaceDescriptorSchema):
    """
    Finds a user whose stored descriptor matches the input.
    Uses Euclidean distance — match if distance < 0.65.
    """
    from app.db.session import prisma as db

    try:
        log("[FACE LOGIN] Request received")

        # --- 1. Fetch all users ---
        all_users = await db.user.find_many()
        log(f"[FACE LOGIN] Fetched {len(all_users)} users from DB")

        # Keep only users who have a face profile
        users_with_face = [u for u in all_users if getattr(u, "face_descriptor", None)]
        log(f"[FACE LOGIN] {len(users_with_face)} user(s) have a face profile")

        if not users_with_face:
            log("[FACE LOGIN] No face profiles found in DB — aborting")
            raise HTTPException(status_code=401, detail="Aucun profil facial enregistré")

        # --- 2. Compare descriptors ---
        THRESHOLD = 0.65
        best_match = None
        best_dist = 1.0

        for user in users_with_face:
            try:
                stored = json.loads(user.face_descriptor)
                dist = euclidean_distance(data.descriptor, stored)
                log(f"[FACE LOGIN] Compare {user.username}: dist={dist:.4f}")

                if dist < THRESHOLD and dist < best_dist:
                    best_dist = dist
                    best_match = user
            except Exception as loop_err:
                log(f"[FACE LOGIN] Loop error for {user.username}: {str(loop_err)}")
                continue

        # --- 3. Result ---
        if not best_match:
            log(f"[FACE LOGIN] No match. Best dist={best_dist:.4f} (threshold={THRESHOLD})")
            raise HTTPException(status_code=401, detail="Visage non reconnu")

        log(f"[FACE LOGIN] MATCH FOUND: {best_match.username} (dist={best_dist:.4f})")

        token_data = make_token_data(best_match)
        return {
            "access_token": create_access_token(data=token_data),
            "refresh_token": create_refresh_token(data=token_data),
            "token_type": "bearer",
            "user": {
                "id": best_match.id,
                "username": best_match.username,
                "role": best_match.role,
                "name": best_match.name,
            },
        }

    except Exception as e:
        import traceback
        log(f"[FACE LOGIN] CRITICAL ERROR: {str(e)}\n{traceback.format_exc()}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))
