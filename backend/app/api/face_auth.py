from fastapi import APIRouter, Depends, HTTPException, status # Composants pour fabriquer les tiroirs de l'API
import json # Outil pour stocker/lire des listes au format texte simple
import math # Outil de mathématiques (racine carrée, puissance)
from typing import List, Optional

from prisma import Prisma # Notre majordome de base de données SQL
from app.db.session import get_db
from app.api.auth import make_token_data # Fabrique le paquet d'informations de l'utilisateur
from app.core.security import create_access_token, create_refresh_token # Fabrique les clés d'accès JWT sécurisées
from pydantic import BaseModel # Modèle pour valider le format des données reçues

from app.api.deps import get_current_user # Vérifie qui appelle l'API

router = APIRouter()

LOG_FILE = "face_debug_log.txt" # Fichier texte pour enregistrer les tentatives de connexion

def log(msg: str):
    """Enregistre un message dans notre fichier journal pour le débogage."""
    try:
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(msg + "\n")
    except Exception:
        pass  # Empêche un bug d'écriture de faire planter l'application


class FaceDescriptorSchema(BaseModel):
    descriptor: List[float] # Une liste de 128 chiffres décrivant les distances du visage

class FaceEnrollSchema(BaseModel):
    """Permet d'enregistrer 5 photos de visages différentes pour être plus précis."""
    descriptors: List[List[float]]  # Liste de 5 visages (chacun décrit par 128 chiffres)


# 📐 LE CALCULATEUR DE DISTANCE DE VISAGE (Distance Euclidienne) :
# C'est une formule mathématique (théorème de Pythagore généralisé)
# Elle mesure l'écart géométrique exact entre deux visages.
def euclidean_distance(v1: List[float], v2: List[float]) -> float:
    if len(v1) != len(v2):
        return 1.0 # Si les deux visages n'ont pas le même nombre de mesures, ils sont totalement différents
    return math.sqrt(sum((a - b) ** 2 for a, b in zip(v1, v2)))


def best_distance_against_stored(candidate: List[float], stored_json: str) -> float:
    """
    Compare le visage devant la caméra avec le ou les visages enregistrés en base.
    Renvoie la plus petite distance trouvée (le meilleur score).
    """
    stored = json.loads(stored_json) # Décode le texte stocké en base en liste exploitable

    # Si un seul visage est enregistré
    if stored and isinstance(stored[0], float):
        return euclidean_distance(candidate, stored)

    # Si plusieurs échantillons (5 photos) sont enregistrés, on compare avec chacun d'eux
    distances = [euclidean_distance(candidate, desc) for desc in stored if isinstance(desc, list)]
    return min(distances) if distances else 1.0 # Renvoie le score de la photo la plus ressemblante


@router.post("/face/enroll")
async def enroll_face(
    data: FaceDescriptorSchema,
    db: Prisma = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Enregistre une seule photo du visage de l'utilisateur."""
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
    """Enregistre 5 photos différentes du visage pour plus de stabilité (conseillé)."""
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
    Tiroir de connexion par reconnaissance faciale.
    Compare le visage devant la caméra avec tous les utilisateurs de la base de données.
    """
    from app.db.session import prisma as db

    # 📏 SEUILS DE SÉCURITÉ :
    THRESHOLD = 0.55   # Si la distance est inférieure à 0.55, c'est la bonne personne
    MIN_GAP   = 0.08   # Évite de confondre deux personnes qui se ressemblent (ex: des jumeaux)

    try:
        log("[FACE LOGIN] Request received")

        # ── 1. RÉCUPÉRATION DES UTILISATEURS AVEC UN VISAGE ENREGISTRÉ ──
        all_users = await db.user.find_many()
        users_with_face = [u for u in all_users if getattr(u, "face_descriptor", None)]
        log(f"[FACE LOGIN] {len(users_with_face)} user(s) with face profile")

        if not users_with_face:
            raise HTTPException(status_code=401, detail="Aucun profil facial enregistré")

        # ── 2. CALCUL DE LA DISTANCE POUR TOUS LES UTILISATEURS ──
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

        # Trie du plus ressemblant au moins ressemblant
        results.sort(key=lambda x: x[0])
        best_dist, best_match = results[0] # Récupère le meilleur candidat

        # ── 3. VÉRIFICATION DU SEUIL STRICT ──
        if best_dist >= THRESHOLD:
            log(f"[FACE LOGIN] REJECTED — best dist={best_dist:.4f} >= threshold={THRESHOLD}")
            raise HTTPException(status_code=401, detail="Visage non reconnu")

        # ── 4. SÉCURITÉ ANTI-CONFUSION (MIN_GAP) ──
        # Si le 2ème candidat le plus ressemblant a un score trop proche du 1er,
        # on refuse la connexion par sécurité pour éviter toute confusion d'identité.
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

        # ── 5. SUCCÈS : CONNEXION ET ENVOI DU JETON JWT ──
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
    Slightly relaxed vs /face/login because we already know WHICH user to check against.
    0.50 = allows minor lighting/angle variations between enrollment and login frames.
    """
    THRESHOLD = 0.60   # Relaxed: frontend already confirmed match, allow natural variation

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

