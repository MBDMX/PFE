from app.models.models import User, Machine, Stock, WorkOrder, WorkOrderStep, WorkOrderPart, PartsRequest, PartsRequestItem, StockMovement
from app.core.security import get_password_hash

def execute_seed_data(db):
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
        db.commit()
