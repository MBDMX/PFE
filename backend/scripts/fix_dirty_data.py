import sqlite3
import os

db_path = "gmao-pro.db"

def fix_data():
    if not os.path.exists(db_path):
        print(f"❌ Database {db_path} not found.")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # 1. Fix missing 'type'
    cursor.execute("UPDATE work_orders SET type = 'corrective' WHERE type IS NULL OR type = ''")
    types_fixed = cursor.rowcount
    
    # 2. Fix missing 'priority'
    cursor.execute("UPDATE work_orders SET priority = 'medium' WHERE priority IS NULL OR priority = ''")
    priorities_fixed = cursor.rowcount
    
    # 3. Fix missing 'status'
    cursor.execute("UPDATE work_orders SET status = 'open' WHERE status IS NULL OR status = ''")
    status_fixed = cursor.rowcount

    conn.commit()
    
    print(f"✅ Data maintenance complete:")
    print(f"   - Fixed {types_fixed} records with missing 'type'")
    print(f"   - Fixed {priorities_fixed} records with missing 'priority'")
    print(f"   - Fixed {status_fixed} records with missing 'status'")
    
    conn.close()

if __name__ == "__main__":
    fix_data()
