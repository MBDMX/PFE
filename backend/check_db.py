from app.db.session import SessionLocal
from app.models.models import WorkOrder, WorkOrderPart, Stock

def audit():
    db = SessionLocal()
    try:
        # Initial Seed values
        # FH-HYD-100: 25
        # CT-B47: 12
        # SKF-6205: 8
        # JT-NBR-50: 150
        
        print("--- Stock Audit ---")
        stocks = db.query(Stock).all()
        for s in stocks:
            print(f"Ref: {s.reference}, Name: {s.name}, Qty: {s.quantity}")
            
        print("\n--- Work Order Audit ---")
        wos = db.query(WorkOrder).all()
        for wo in wos:
            print(f"ID: {wo.id}, Status: {wo.status}, Title: {wo.title}")
            for p in wo.parts:
                print(f"  Part: {p.part_code} x{p.quantity}")
                
    finally:
        db.close()

if __name__ == "__main__":
    audit()
