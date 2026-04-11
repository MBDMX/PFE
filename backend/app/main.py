from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import auth, machines, work_orders, stock, stats, system, users, magasinier
from app.db.session import prisma

app = FastAPI(title="GMAO API", version="2.0.1")

# ... middleware setup ...
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    await prisma.connect()

@app.on_event("shutdown")
async def shutdown():
    await prisma.disconnect()

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)
