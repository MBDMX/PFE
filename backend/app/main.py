from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from app.api import auth, machines, work_orders, stock, stats, system, users, magasinier, sap
from app.db.session import prisma
from app.core.websocket import manager

app = FastAPI(title="GMAO Platform PRO", version="2.1.0")

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://.*", # Allow any origin in dev to fix Network Errors
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition", "Access-Control-Expose-Headers"]
)

@app.on_event("startup")
async def startup():
    await prisma.connect()

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
app.include_router(stock.router, prefix="/api")
app.include_router(stock.pr_router, prefix="/api")
app.include_router(stats.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(magasinier.router, prefix="/api")
app.include_router(sap.router, prefix="/api")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)
