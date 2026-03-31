import sqlite3
import random

db_path = "gmao-pro.db"

# Realistic TND prices for industrial spare parts
REALISTIC_PRICES_TND = {
    # Belts / Courroies
    "CT-B47": 18.500,
    "CT-A35": 12.750,
    
    # Bearings / Roulements  
    "RLM-6205": 34.200,
    "RLM-6307": 52.800,
    
    # Filters / Filtres
    "FH-WIX33": 28.000,
    "FH-BAL90": 45.500,
    "FA-M25": 15.200,
    
    # Seals / Joints
    "JT-60X80": 8.900,
    "JT-45X55": 6.500,
    
    # Cylinders / Vérins
    "VER-P50": 185.000,
    "VER-P32": 145.000,
    
    # Sensors / Capteurs
    "CAP-IND-M12": 95.000,
    "CAP-SQ-PNP": 78.500,
    
    # Lubricants
    "GRS-SKF-400": 22.000,
    
    # Electrical
    "CON-LC1D25": 68.000,
    "RT-SCH-6A": 42.500,
}

def seed_tnd_prices():
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Get all stock items with their references
    cursor.execute("SELECT id, name, reference FROM stock_items")
    rows = cursor.fetchall()
    
    for row in rows:
        item_id, name, ref = row
        
        # Try to find a predefined price by reference
        price = REALISTIC_PRICES_TND.get(ref)
        
        if not price:
            # Guess a reasonable price based on item category
            name_lower = (name or "").lower()
            if any(kw in name_lower for kw in ["courroie", "bande"]):
                price = round(random.uniform(10.0, 35.0), 3)
            elif any(kw in name_lower for kw in ["roulement"]):
                price = round(random.uniform(25.0, 90.0), 3)
            elif any(kw in name_lower for kw in ["filtre"]):
                price = round(random.uniform(12.0, 65.0), 3)
            elif any(kw in name_lower for kw in ["joint"]):
                price = round(random.uniform(5.0, 20.0), 3)
            elif any(kw in name_lower for kw in ["vérin", "verin"]):
                price = round(random.uniform(100.0, 300.0), 3)
            elif any(kw in name_lower for kw in ["capteur"]):
                price = round(random.uniform(60.0, 150.0), 3)
            elif any(kw in name_lower for kw in ["graisse"]):
                price = round(random.uniform(15.0, 45.0), 3)
            elif any(kw in name_lower for kw in ["contacteur", "relais"]):
                price = round(random.uniform(30.0, 100.0), 3)
            else:
                price = round(random.uniform(15.0, 80.0), 3)
        
        cursor.execute("UPDATE stock_items SET unit_price = ? WHERE id = ?", (price, item_id))
        print(f"  {name} ({ref}) → {price} TND")
    
    conn.commit()
    print(f"\n✅ Updated {len(rows)} stock items with realistic TND prices.")
    conn.close()

if __name__ == "__main__":
    seed_tnd_prices()
