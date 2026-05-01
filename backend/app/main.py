from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.api import auth, machines, work_orders, stock, stats, system, users, magasinier, sap, face_auth, predictive
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
        # Extrait l'ID de "1.jpg"
        filename = request.url.path.split("/")[-1]
        if filename.endswith(".jpg") and filename[:-4].isdigit():
            new_path = f"/static/parts/part_{filename}"
            from fastapi.responses import RedirectResponse
            return RedirectResponse(url=new_path)
    return await call_next(request)

@app.on_event("startup")
async def startup():
    await prisma.connect()
    # ✅ On lance la réparation en arrière-plan pour ne pas bloquer le démarrage du serveur
    import asyncio
    asyncio.create_task(_auto_fix_images())

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
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(system.router, prefix="/api")
app.include_router(machines.router, prefix="/api")
app.include_router(work_orders.router, prefix="/api")
app.include_router(stock.router, prefix="/api/stock")
app.include_router(stock.pr_router, prefix="/api")
app.include_router(stats.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(magasinier.router, prefix="/api")
app.include_router(sap.router, prefix="/api")
app.include_router(face_auth.router, prefix="/api", tags=["face-auth"])
app.include_router(predictive.router, prefix="/api")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)
