import sqlite3
import os

# From backend directory, the path is gmao-pro.db
db_path = "gmao-pro.db"

def migrate():
    print(f"Connecting to {db_path}...")
    if not os.path.exists(db_path):
        print(f"Error: Database file not found at {db_path}")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    try:
        # Check if columns exist in machines table
        cursor.execute("PRAGMA table_info(machines)")
        columns = [c[1] for c in cursor.fetchall()]
        
        if "last_maintenance_date" not in columns:
            cursor.execute("ALTER TABLE machines ADD COLUMN last_maintenance_date TEXT")
            print("Successfully added 'last_maintenance_date' to machines.")
        
        if "next_maintenance_date" not in columns:
            cursor.execute("ALTER TABLE machines ADD COLUMN next_maintenance_date TEXT")
            print("Successfully added 'next_maintenance_date' to machines.")
            
        conn.commit()
    except sqlite3.OperationalError as e:
        print(f"Error during migration: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
