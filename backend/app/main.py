from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request # Outil pour fabriquer le serveur API Web
from fastapi.middleware.cors import CORSMiddleware # Outil de sécurité pour autoriser le dialogue avec le frontend
from fastapi.staticfiles import StaticFiles # Permet d'envoyer des fichiers (ex: des photos de pièces) aux navigateurs
import os # Boîte à outils du système d'exploitation (pour créer des dossiers, vérifier des fichiers)

import asyncio # Permet d'exécuter des tâches en parallèle pour ne pas ralentir le serveur
from app.api import auth, machines, work_orders, stock, stats, system, users, magasinier, sap, face_auth, predictive # Importe tous les tiroirs de l'application
from app.db.session import prisma # Le majordome de notre base de données (Prisma)
from app.core.websocket import manager # Gère l'envoi de messages instantanés (WebSockets) comme un talkie-talkie

app = FastAPI(title="GMAO Platform PRO", version="2.1.0") # Crée le serveur de notre application GMAO

# 🔐 SÉCURITÉ DE DIALOGUE (CORS Middleware) :
# Dit au serveur : "Tu as le droit d'écouter et de répondre à TOUS les navigateurs du réseau"
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Autorise toutes les adresses internet
    allow_credentials=True, # Autorise les connexions sécurisées
    allow_methods=["*"], # Autorise toutes les actions (lire, écrire, supprimer)
    allow_headers=["*"], # Autorise tous les formats de messages
    expose_headers=["*"]
)

# 📂 CRÉATION ET ACCÈS AU DOSSIER PHOTOS :
# Crée automatiquement sur le disque dur le dossier où seront rangées les photos des pièces
os.makedirs("static/parts", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static") # Rend ce dossier accessible depuis internet

# 🔄 PASSERELLE DE REDIRECTION DES IMAGES :
# Si un vieux lien d'image (ex: 1.jpg) est demandé, le serveur le transforme intelligemment
# vers le nouveau nom de fichier sécurisé (ex: part_1.jpg) pour éviter un écran blanc
@app.middleware("http")
async def redirect_old_images(request: Request, call_next):
    if request.url.path.startswith("/static/parts/") and not "/part_" in request.url.path:
        filename = request.url.path.split("/")[-1]
        if filename.endswith(".jpg") and filename[:-4].isdigit():
            new_path = f"/static/parts/part_{filename}"
            from fastapi.responses import RedirectResponse
            return RedirectResponse(url=new_path) # Redirige proprement le navigateur vers le bon fichier
    return await call_next(request)

# 🚀 DÉMARRAGE DU SERVEUR (Startup Event) :
@app.on_event("startup")
async def startup():
    await prisma.connect() # Allume la connexion avec la base de données PostgreSQL/SQLite
    # Lance le robot nettoyeur d'images en tâche de fond pour ne pas faire patienter l'utilisateur
    import asyncio
    asyncio.create_task(_auto_fix_images())

# 🧹 LE ROBOT NETTOYEUR DE PHOTOS DÉTACHÉES :
# Il inspecte le disque dur. Si la base de données indique qu'une pièce a une photo,
# mais que le fichier a été supprimé du disque dur, le robot réinitialise l'information
# pour éviter des liens cassés sur le site.
async def _auto_fix_images():
    try:
        all_parts = await prisma.stock.find_many() # Récupère toutes les pièces en stock
        total = len(all_parts)
        print(f"🚀 [STARTUP] Vérification physique des images locales pour {total} pièces...")
        
        fixed = 0
        for part in all_parts:
            img = part.image or ""
            if img.startswith("/static/parts/"):
                disk_path = img.lstrip("/") # Nettoie le chemin du fichier sur disque
                if not os.path.exists(disk_path): # Si le fichier n'existe pas physiquement
                    await prisma.stock.update(
                        where={"id": part.id},
                        data={"image": None, "image_verified": False} # Supprime le lien brisé
                    )
                    fixed += 1
                    
        if fixed > 0:
            print(f"⚠️ [STARTUP] {fixed} images introuvables sur le disque ont été réinitialisées en base.")
        else:
            print("✅ [STARTUP] Toutes les images locales de pièces sont intègres physiquement.")
    except Exception as e:
        print(f"⚠️ [STARTUP] Erreur vérification physique des images: {e}")

# 🛑 EXTINCTION DU SERVEUR (Shutdown Event) :
@app.on_event("shutdown")
async def shutdown():
    await prisma.disconnect() # Éteint proprement la connexion à la base de données

# 📡 LE CANAL DES MESSAGES EN TEMPS RÉEL (WebSocket) :
# C'est comme une antenne relais. Elle maintient un fil invisible ouvert entre le serveur
# et tous les écrans des techniciens pour leur envoyer des notifications de panne instantanées.
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket) # Connecte l'écran de l'utilisateur à l'antenne
    try:
        while True:
            await websocket.receive_text() # Reste à l'écoute de messages envoyés par l'utilisateur
    except WebSocketDisconnect:
        manager.disconnect(websocket) # Déconnecte proprement si l'utilisateur ferme sa page

# 🗺️ LE PLAN DE ROUTAGE DE L'API (Tiroirs par module) :
# Associe chaque adresse internet (route) au fichier technique correspondant :
app.include_router(auth.router, prefix="/api/auth", tags=["auth"]) # Gestion des logins/mots de passe
app.include_router(system.router, prefix="/api") # Informations techniques du serveur
app.include_router(machines.router, prefix="/api") # Données du Parc Machines SAP
app.include_router(work_orders.router, prefix="/api") # Bons de travaux (pannes)
app.include_router(stock.router, prefix="/api/stock") # Recherche sémantique IA du Stock
app.include_router(stock.pr_router, prefix="/api") # Demandes d'Achats SAP
app.include_router(stats.router, prefix="/api") # Graphiques financiers et ratios de clôture
app.include_router(users.router, prefix="/api") # Création de comptes utilisateurs
app.include_router(magasinier.router, prefix="/api") # Alertes logistiques
app.include_router(sap.router, prefix="/api") # Passerelle Service Layer SAP B1
app.include_router(face_auth.router, prefix="/api", tags=["face-auth"]) # Biométrie Face ID
app.include_router(predictive.router, prefix="/api") # Maintenance prédictive IA

# 🔌 DÉMARRAGE TECHNIQUE DIRECT :
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000) # Lance le serveur sur le port 5000

