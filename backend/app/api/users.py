from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from prisma import Prisma
from app.db.session import get_db
from app.api.deps import role_required, get_current_user
from app.schemas.schemas import UserOut, WorkSession as WorkSessionSchema
from app.core.security import get_password_hash

"""
🎓 JOUR 1 : GESTION DES UTILISATEURS & KPIs TECHNICIENS - BACKEND
Ce fichier régit la gestion des utilisateurs, les sessions de travail des techniciens (Timers)
et le calcul des indicateurs de performance (KPIs) individuels.

Concepts majeurs à valoriser lors de ta soutenance technique :
1. Sécurité basée sur les Rôles (RBAC) : `role_required(["admin", "manager"])`
   Contrôle d'accès strict pour isoler les vues d'administration et de supervision.

2. Calcul des indicateurs de performance (KPIs) : `get_technician_individual_stats`
   Agrégation automatique en temps réel des statistiques clés d'un technicien :
   - Taux de complétion des interventions (Completion Rate) : (OT complétés / total OTs assignés).
   - Temps moyen de réparation (Mean Time to Repair - MTTR) : Moyenne de `time_spent` sur tous les OTs terminés.
   - Retard de maintenance (Overdue OTs) : Comparaison avec la date du jour `date.today()`.
"""

router = APIRouter(tags=["users"]) # Déclaration du routeur FastAPI pour regrouper toutes les routes d'utilisateurs sous l'étiquette "users"

# 🟢 1. OBTENIR LA LISTE DE TOUS LES TECHNICIENS (Pour les assignations)
@router.get("/technicians", response_model=List[UserOut])
async def get_technicians(db: Prisma = Depends(get_db)):
    """Renvoie la liste de tous les techniciens enregistrés dans le système."""
    return await db.user.find_many(where={'role': "technician"}) # Requête Prisma : cherche les utilisateurs ayant le rôle "technician"

# 🟢 2. RÉCUPÉRER LE CHRONOMÈTRE ACTIF D'UN TECHNICIEN (Suivi temps réel)
@router.get("/technician/timer/active", response_model=Optional[WorkSessionSchema])
async def get_global_active_timer(db: Prisma = Depends(get_db), current_user = Depends(get_current_user)):
    """Cherche si le technicien connecté a une session de chronomètre active (end_time à None)."""
    active = await db.worksession.find_first(
        where={"technician_id": current_user.id, "end_time": None}, # Session sans date de fin (chrono toujours en cours)
        include={"work_order": True} # Inclut les détails du Bon de Travail associé
    )
    if not active:
        return None # Aucun chrono actif
    
    # Récupère l'historique des sessions terminées pour cet OT afin de calculer le temps déjà cumulé
    previous_sessions = await db.worksession.find_many(
        where={
            "work_order_id": active.work_order_id,
            "end_time": {"not": None}
        }
    )
    total_previous_hours = sum(s.duration for s in previous_sessions) # Calcule le cumul en heures
    
    res = active.dict() # Convertit le résultat Prisma en dictionnaire Python
    res["total_previous_seconds"] = int(total_previous_hours * 3600) # Convertit les heures cumulées en secondes pour le frontend
    res["work_order_title"] = active.work_order.title if active.work_order else "Intervention" # Ajoute le titre de l'intervention
    return res

# 🟢 3. LISTE DES TECHNICIENS POUR LES MANAGERS
@router.get("/manager/technicians", response_model=List[UserOut])
async def get_manager_technicians(db: Prisma = Depends(get_db), current_user = Depends(role_required(["admin", "manager"]))):
    """Renvoie la liste des techniciens uniquement aux utilisateurs connectés en tant que responsable ou admin (sécurité RBAC)."""
    return await db.user.find_many(where={'role': "technician"})

# 🟢 4. CALCUL INDIVIDUEL DES INDICATEURS CLÉS DE PERFORMANCE (KPIs) D'UN TECHNICIEN
@router.get("/manager/technicians/{tech_id}/stats")
async def get_technician_individual_stats(tech_id: int, db: Prisma = Depends(get_db)):
    """Calcule en temps réel les statistiques d'efficacité d'un technicien (taux de réussite, MTTR, retards)."""
    from datetime import date
    
    wos = await db.workorder.find_many(where={"technician_id": tech_id}) # Récupère tous les OTs assignés à ce technicien
    total = len(wos) # Nombre total d'OTs assignés
    done = sum(1 for w in wos if w.status == "done") # Compte les OTs complétés
    open_ot = sum(1 for w in wos if w.status == "open") # Compte les OTs non commencés
    in_progress = sum(1 for w in wos if w.status == "in_progress") # Compte les OTs en cours
    
    today = date.today().isoformat() # Date du jour au format ISO
    # Compte les OTs non finis dont la date de fin prévue est dépassée (Maintenance en retard)
    overdue = sum(1 for w in wos if w.status != "done" and w.planned_end_date and w.planned_end_date < today)
    
    rate = round((done / total) * 100) if total > 0 else 0 # Taux de complétion en % (ex: 85%)
    
    # MTTR (Mean Time to Repair) : Temps moyen de réparation en heures (moyenne du temps passé sur les OTs finis)
    repair_times = [w.time_spent for w in wos if w.status == "done" and w.time_spent]
    avg_time = round(sum(repair_times) / len(repair_times), 1) if repair_times else 0
    
    # Renvoie un rapport complet structuré en dictionnaire JSON pour l'affichage de notre Dashboard de supervision
    return {
        "totalAssigned": total,
        "doneOT": done,
        "openOT": open_ot,
        "inProgressOT": in_progress,
        "overdueOT": overdue,
        "completionRate": rate,
        "avgRepairTime": avg_time
    }

# 🟢 5. OBTENIR LES BONS DE TRAVAIL D'UN TECHNICIEN PRÉCIS
@router.get("/manager/technicians/{tech_id}/work-orders")
async def get_tech_work_orders(tech_id: int, db: Prisma = Depends(get_db)):
    """Renvoie tous les bons de travail d'un technicien précis avec le détail de ses pièces et étapes."""
    return await db.workorder.find_many(
        where={"technician_id": tech_id}, 
        include={"parts": True, "steps": True}, 
        order={'created_at': 'desc'} # Du plus récent au plus ancien
    )

# ── SECTION ADMINISTRATION DES COMPTES UTILISATEURS (ADMIN PRIVILEGES) ──────────────────────────────────

# 🟢 6. LISTER TOUS LES UTILISATEURS DE LA GMAO
@router.get("/admin/users")
async def admin_list_users(
    db: Prisma = Depends(get_db),
    _=Depends(role_required(["admin"])) # Sécurité stricte : Seul l'Administrateur suprême a accès à cette route !
):
    """Liste tous les comptes utilisateurs configurés dans l'application."""
    users = await db.user.find_many(order={"id": "asc"})
    return [
        {
            "id": u.id,
            "name": u.name or u.username,
            "username": u.username,
            "email": u.email or "",
            "role": u.role,
            "is_active": getattr(u, "is_active", True),
            "permissions": getattr(u, "permissions", "{}")
        }
        for u in users
    ]

# 🟢 7. SUPPRIMER UN COMPTE UTILISATEUR
@router.delete("/admin/users/{user_id}")
async def admin_delete_user(
    user_id: int,
    db: Prisma = Depends(get_db),
    current_user=Depends(role_required(["admin"])) # Sécurité stricte Administrateur
):
    """Supprime définitivement un compte utilisateur (sauf le sien pour éviter de se bloquer)."""
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas supprimer votre propre compte.")
    user = await db.user.find_unique(where={"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé.")
    await db.user.delete(where={"id": user_id}) # Commande Prisma : supprime de la base de données
    return {"ok": True, "deleted_id": user_id}

# 🟢 8. METTRE À JOUR UN COMPTE UTILISATEUR (Changement de rôle, mot de passe, etc.)
@router.patch("/admin/users/{user_id}")
async def admin_update_user(
    user_id: int,
    data: dict,
    db: Prisma = Depends(get_db),
    _=Depends(role_required(["admin"])) # Sécurité stricte Administrateur
):
    """Modifie le nom, le rôle, le mot de passe (haché par sécurité) ou le statut d'activité d'un utilisateur."""
    update_data = {}
    if "role" in data:
        update_data["role"] = data["role"]
    if "name" in data:
        update_data["name"] = data["name"]
    if "password" in data and data["password"]:
        update_data["password_hash"] = get_password_hash(data["password"]) # Hachage sécurisé du mot de passe (sécurité OWASP)
    
    requested_active = data.get("is_active")
    if requested_active is not None:
        update_data["is_active"] = requested_active
    
    if not update_data:
        raise HTTPException(status_code=400, detail="Aucune donnée à mettre à jour.")
    
    try:
        updated = await db.user.update(where={"id": user_id}, data=update_data)
    except Exception:
        # Gestion d'erreur au cas où le modèle Prisma n'a pas encore le champ is_active d'implémenté
        update_data.pop("is_active", None)
        if not update_data:
            user = await db.user.find_unique(where={"id": user_id})
            return {"id": user_id, "name": user.name, "role": user.role, "is_active": True}
        updated = await db.user.update(where={"id": user_id}, data=update_data)

    return {
        "id": updated.id, 
        "name": updated.name, 
        "role": updated.role, 
        "is_active": getattr(updated, "is_active", True),
    }

