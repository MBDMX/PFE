import sqlite3

db_path = "gmao-pro.db"

def migrate():
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Add maintenance_frequency_days to machines
    try:
        cursor.execute("ALTER TABLE machines ADD COLUMN maintenance_frequency_days INTEGER DEFAULT 90")
        print("Column maintenance_frequency_days added to machines.")
    except sqlite3.OperationalError:
        print("Column already exists.")

    # Seed some example frequencies
    # Machine 1 every 30 days (monthly), machine 2 every 90 days (quarterly), machine 3 every 180 days (semi-annual)
    cursor.execute("UPDATE machines SET maintenance_frequency_days = 30  WHERE id = 1")
    cursor.execute("UPDATE machines SET maintenance_frequency_days = 90  WHERE id = 2")
    cursor.execute("UPDATE machines SET maintenance_frequency_days = 180 WHERE id = 3")
    
    conn.commit()
    print("Seeded example maintenance frequencies.")
    conn.close()

if __name__ == "__main__":
    migrate()
