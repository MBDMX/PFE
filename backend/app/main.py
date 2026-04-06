from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import auth, gmao
from app.db.session import engine, Base, SessionLocal
from app.models.models import User, Machine, Stock, WorkOrder, WorkOrderPart, PartsRequest, PartsRequestItem
from app.core.security import get_password_hash

# Initialize Database
Base.metadata.create_all(bind=engine)

app = FastAPI(title="GMAO PRO API", version="1.1.0")

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def seed_data():
    db = SessionLocal()
    if db.query(User).count() == 0:
        # Seeding with Emails for the new auth system
        db.add_all([
            User(username="admin", email="admin@gmao-pro.com", password_hash=get_password_hash("admin123"), role="admin", name="Admin Principal"),
            User(username="manager", email="manager@gmao-pro.com", password_hash=get_password_hash("mgr123"), role="manager", name="Chef Maintenance", team="Direction"),
            User(username="tech1", email="tech1@gmao-pro.com", password_hash=get_password_hash("tech123"), role="technician", name="Technicien #1", manager_id=2, team="Maint-Meca"),
            User(username="magasinier1", email="mag@gmao-pro.com", password_hash=get_password_hash("mag123"), role="magasinier", name="Magasinier Central"),
        ])
        db.add_all([
            Machine(name="Compresseur A1", reference="COMP-001", location="Atelier Nord", status="operational", health_score=85),
            Machine(name="Tour CN-200", reference="TCN-200", location="Atelier Sud", status="maintenance", health_score=60),
            Machine(name="Convoyeur B3", reference="CONV-003", location="Ligne B", status="operational", health_score=92),
            Machine(name="Presse Hydraulique P5", reference="PH-005", location="Atelier Est", status="breakdown", health_score=15),
        ])
        db.add_all([
            Stock(name="Courroie trapézoïdale B47", reference="CT-B47", quantity=12, unit="unité", location="Rayon A1", image="/pieces/courroie.png", synonyms="belt, bande, courroie moteur, trapeze belt"),
            Stock(name="Roulement à billes SKF 6205", reference="SKF-6205", quantity=8, unit="unité", location="Rayon B2", image="/pieces/roulement.png", synonyms="bearing, palier, roulement moteur, ball bearing"),
            Stock(name="Filtre à huile hydraulique", reference="FH-HYD-100", quantity=25, unit="unité", location="Rayon C1", image="/pieces/filtre.png", synonyms="oil filter, filtre, cartouche huile, hydraulic filter"),
            Stock(name="Joint torique NBR 50x3mm", reference="JT-NBR-50", quantity=150, unit="unité", location="Rayon A3", image="/pieces/joint.png", synonyms="o-ring, joint caoutchouc, seal, bague étanchéité"),
            Stock(name="Vérin pneumatique FESTO", reference="VP-FESTO-32", quantity=4, unit="unité", location="Rayon D1", image="", synonyms="cylinder, piston, vérin air, pneumatic actuator"),
            Stock(name="Graisse industrielle Mobilux", reference="GR-MOB-EP2", quantity=18, unit="kg", location="Rayon C3", image="", synonyms="grease, lubrifiant, graissage, lubrication"),
            Stock(name="Capteur inductif M12 PNP", reference="CI-M12-PNP", quantity=15, unit="unité", location="Rayon E2", image="", synonyms="sensor, détecteur, proximity, capteur approche"),
            Stock(name="Relais thermique Schneider", reference="RT-SCH-6A", quantity=6, unit="unité", location="Rayon E1", image="", synonyms="thermal relay, protection moteur, overload, disjoncteur thermique"),
        ])
        db.add_all([
            WorkOrder(sap_order_id="SAP-WO-1052", title="Vidange compresseur", description="Effectuer vidange préventive", type="preventive", priority="medium", status="open", technical_location="Atelier Nord", equipment_id="COMP-001", team="Maint-Meca", technician_id=3, planned_start_date="2026-03-10", planned_end_date="2026-03-10"),
            WorkOrder(sap_order_id="SAP-WO-1053", title="Remplacement courroie", description="Courroie de transmission usée", type="corrective", priority="high", status="in_progress", technical_location="Atelier Sud", equipment_id="TCN-200", team="Maint-Meca", technician_id=3, planned_start_date="2026-03-07", planned_end_date="2026-03-08"),
            WorkOrder(sap_order_id="SAP-WO-1054", title="Inspection convoyeur", description="Contrôle périodique mensuel", type="preventive", priority="low", status="done", technical_location="Ligne B", equipment_id="CONV-003", team="Maint-Elec", technician_id=3, planned_start_date="2026-02-28", planned_end_date="2026-02-28"),
            WorkOrder(sap_order_id="SAP-WO-1055", title="Réparation presse", description="Panne hydraulique urgente", type="corrective", priority="high", status="open", technical_location="Atelier Est", equipment_id="PH-005", team="Maint-Hydrique", technician_id=3, planned_start_date="2026-03-06", planned_end_date="2026-03-07")
        ])
        db.add_all([
            WorkOrderPart(work_order_id=2, part_code="CT-B47", part_name="Courroie trapézoïdale B47", quantity=1),
            WorkOrderPart(work_order_id=1, part_code="FH-HYD-100", part_name="Filtre à huile hydraulique", quantity=2),
            WorkOrderPart(work_order_id=4, part_code="JT-NBR-50", part_name="Joint torique NBR 50x3mm", quantity=4)
        ])
        db.commit()
    db.close()

# Include Routers
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(gmao.router, prefix="/api", tags=["gmao"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=4000)
