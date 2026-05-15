from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.api import auth as auth_api, machines as machines_api, work_orders as wo_api, stock as stock_api, stats as stats_api, system as system_api, users as users_api, magasinier as mag_api, sap as sap_api, face_auth as face_api, predictive as pred_api
from app.db.session import prisma
from app.core.websocket import manager

app = FastAPI(title="GMAO Platform PRO", version="2.1.0")

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Setup Static Files
os.makedirs("static/parts", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

# 🔄 Middleware pour rediriger les anciennes images (X.jpg) vers les nouvelles (part_X.jpg)
@app.middleware("http")
async def redirect_old_images(request: Request, call_next):
    if request.url.path.startswith("/static/parts/") and not "/part_" in request.url.path:
        filename = request.url.path.split("/")[-1]
        if filename.endswith(".jpg") and filename[:-4].isdigit():
            new_path = f"/static/parts/part_{filename}"
            from fastapi.responses import RedirectResponse
            return RedirectResponse(url=new_path)
    return await call_next(request)


@app.on_event("startup")
async def startup():
    # Toutes les tâches de fond lourdes sont désactivées pour stabiliser le serveur
    # Cela évite que le processus ne soit tué par Windows ou ne bloque le handshake WS
    pass

async def _ml_retraining_loop():
    """
    Background Task : Réentraîne le modèle ML toutes les 24h.
    Garantit que le modèle s'adapte à l'historique croissant des OT.
    Pattern Pipeline Automatisé (défendable en PFE).
    """
    import asyncio
    from app.core.ml_service import ml_service
    # Premier entraînement au démarrage (après 5s pour laisser le serveur s'initialiser)
    await asyncio.sleep(5)
    try:
        await ml_service.predict_health_scores(prisma)
        print(f"✅ [ML] Modèle entraîné au démarrage. Silhouette Score: {ml_service.silhouette}")
    except Exception as e:
        print(f"⚠️  [ML] Erreur entraînement initial: {e}")
    # Réentraînement toutes les 24h
    while True:
        await asyncio.sleep(86400)
        try:
            await ml_service.predict_health_scores(prisma)
            print(f"🔄 [ML] Réentraînement automatique. Silhouette Score: {ml_service.silhouette}")
        except Exception as e:
            print(f"⚠️  [ML] Erreur réentraînement: {e}")

async def _auto_fix_images():
    """
    Vérifie et répare automatiquement les images de toutes les pièces du stock.
    S'exécute à chaque démarrage du serveur pour garantir que les images sont toujours valides.
    """
    import re
    from app.core.image_service import get_image_url_for_part
    try:
        all_parts = await prisma.stock.find_many()
        fixed = 0
        total = len(all_parts)
        print(f"🚀 [STARTUP] Analyse de {total} pièces pour hébergement local...")
        
        for i, part in enumerate(all_parts):
            img = part.image or ""
            is_local = img.startswith("/static/parts/")
            
            if not is_local:
                # Log de progression tous les 5 items
                if i % 5 == 0:
                    print(f"🔄 Progression : {i}/{total}...")
                
                new_path = await get_image_url_for_part(part.name or "", str(part.id))
                if new_path and new_path.startswith("/static/parts/"):
                    await prisma.stock.update(where={"id": part.id}, data={"image": new_path})
                    fixed += 1
                    # Petite pause pour laisser respirer le serveur
                    await asyncio.sleep(0.05)
                
        if fixed > 0:
            print(f"✅ [STARTUP] TERMINÉ : {fixed} nouvelles images locales ajoutées.")
        else:
            print("✅ [STARTUP] Toutes les images sont déjà locales.")
        if fixed > 0:
            print(f"🖼️  [STARTUP] {fixed} images auto-corrigées.")
        else:
            print(f"✅ [STARTUP] Toutes les images sont déjà valides ({len(all_parts)} pièces).")
    except Exception as e:
        print(f"⚠️  [STARTUP] Erreur lors de la correction des images: {e}")

@app.on_event("shutdown")
async def shutdown():
    await prisma.disconnect()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# Include Modular Routers
app.include_router(auth_api.router, prefix="/api/auth", tags=["auth"])
app.include_router(system_api.router, prefix="/api")
app.include_router(machines_api.router, prefix="/api")
app.include_router(wo_api.router, prefix="/api")
app.include_router(stock_api.router, prefix="/api/stock")
app.include_router(stock_api.pr_router, prefix="/api")
app.include_router(stats_api.router, prefix="/api")
app.include_router(users_api.router, prefix="/api")
app.include_router(mag_api.router, prefix="/api")
app.include_router(sap_api.router, prefix="/api")
app.include_router(face_api.router, prefix="/api", tags=["face-auth"])
app.include_router(pred_api.router, prefix="/api")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)
