import asyncio
from prisma import Prisma
from app.core.security import get_password_hash

async def execute_seed_data(db: Prisma):
    user_count = await db.user.count()
    if user_count == 0:
        print("🌱 Seeding database...")
        # 1. Users
        await db.user.create_many(data=[
            {"username": "admin", "email": "admin@gmao-pro.com", "password_hash": get_password_hash("password"), "role": "admin", "name": "Responsable"},
            {"username": "manager", "email": "manager@gmao-pro.com", "password_hash": get_password_hash("password"), "role": "manager", "name": "Chef Maintenance", "team": "Direction"},
            {"username": "tech1", "email": "tech1@gmao-pro.com", "password_hash": get_password_hash("password"), "role": "technician", "name": "Technicien #1", "manager_id": 2, "team": "Maint-Meca"},
            {"username": "magasinier1", "email": "mag@gmao-pro.com", "password_hash": get_password_hash("password"), "role": "magasinier", "name": "Magasinier Central"},
        ])
        
        # 2. Machines
        await db.machine.create_many(data=[
            {"name": "Compresseur A1", "reference": "COMP-001", "location": "Atelier Nord", "status": "operational", "health_score": 85},
            {"name": "Tour CN-200", "reference": "TCN-200", "location": "Atelier Sud", "status": "maintenance", "health_score": 60},
            {"name": "Convoyeur B3", "reference": "CONV-003", "location": "Ligne B", "status": "operational", "health_score": 92},
            {"name": "Presse Hydraulique P5", "reference": "PH-005", "location": "Atelier Est", "status": "breakdown", "health_score": 15},
        ])
        
        # 3. Stock
        await db.stock.create_many(data=[
            {"name": "Courroie trapézoïdale B47", "reference": "CT-B47", "quantity": 12, "unit": "unité", "location": "Rayon A1", "image": "/pieces/courroie.png", "synonyms": "belt, bande, courroie moteur, trapeze belt"},
            {"name": "Roulement à billes SKF 6205", "reference": "SKF-6205", "quantity": 8, "unit": "unité", "location": "Rayon B2", "image": "/pieces/roulement.png", "synonyms": "bearing, palier, roulement moteur, ball bearing"},
            {"name": "Filtre à huile hydraulique", "reference": "FH-HYD-100", "quantity": 25, "unit": "unité", "location": "Rayon C1", "image": "/pieces/filtre.png", "synonyms": "oil filter, filtre, cartouche huile, hydraulic filter"},
            {"name": "Joint torique NBR 50x3mm", "reference": "JT-NBR-50", "quantity": 150, "unit": "unité", "location": "Rayon A3", "image": "/pieces/joint.png", "synonyms": "o-ring, joint caoutchouc, seal, bague étanchéité"},
            {"name": "Vérin pneumatique FESTO", "reference": "VP-FESTO-32", "quantity": 4, "unit": "unité", "location": "Rayon D1", "image": "", "synonyms": "cylinder, piston, vérin air, pneumatic actuator"},
            {"name": "Graisse industrielle Mobilux", "reference": "GR-MOB-EP2", "quantity": 18, "unit": "kg", "location": "Rayon C3", "image": "", "synonyms": "grease, lubrifiant, graissage, lubrication"},
            {"name": "Capteur inductif M12 PNP", "reference": "CI-M12-PNP", "quantity": 15, "unit": "unité", "location": "Rayon E2", "image": "", "synonyms": "sensor, détecteur, proximity, capteur approche"},
            {"name": "Relais thermique Schneider", "reference": "RT-SCH-6A", "quantity": 6, "unit": "unité", "location": "Rayon E1", "image": "", "synonyms": "thermal relay, protection moteur, overload, disjoncteur thermique"},
        ])
        # 4. Work Orders (History for KPIs)
        await db.workorder.create_many(data=[
            {
                "sap_order_id": "SAP-WO-1001",
                "title": "Réparation fuite huile COMP-001",
                "description": "Remplacement joint et appoint huile",
                "type": "corrective",
                "priority": "high",
                "status": "done",
                "equipment_id": "COMP-001",
                "technical_location": "Atelier Nord",
                "planned_start_date": "2026-04-01",
                "planned_end_date": "2026-04-01",
                "actual_start_date": "2026-04-01",
                "actual_end_date": "2026-04-01",
                "time_spent": 2.5,
                "created_by": 1
            },
            {
                "sap_order_id": "SAP-WO-1002",
                "title": "Changement courroie Tour CN",
                "description": "Courroie rompue lors du cycle",
                "type": "breakdown",
                "priority": "critical",
                "status": "done",
                "equipment_id": "TCN-200",
                "technical_location": "Atelier Sud",
                "planned_start_date": "2026-04-03",
                "planned_end_date": "2026-04-03",
                "actual_start_date": "2026-04-03",
                "actual_end_date": "2026-04-03",
                "time_spent": 1.2,
                "created_by": 1
            },
            {
                "sap_order_id": "SAP-WO-1003",
                "title": "Inspection hebdomadaire",
                "description": "Vérification des niveaux",
                "type": "preventive",
                "priority": "low",
                "status": "done",
                "equipment_id": "CONV-003",
                "technical_location": "Ligne B",
                "planned_start_date": "2026-04-05",
                "planned_end_date": "2026-04-05",
                "actual_start_date": "2026-04-05",
                "actual_end_date": "2026-04-05",
                "time_spent": 0.5,
                "created_by": 1
            }
        ])

        print("✅ Database seeded successfully.")
