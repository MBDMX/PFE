import sqlite3
import os

# Correct database path found: gmao-pro.db in backend root
db_path = "gmao-pro.db"

def migrate():
    print(f"Connecting to {db_path}...")
    if not os.path.exists(db_path):
        print(f"Error: Database file not found at {db_path}")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    try:
        # Check if column exists
        cursor.execute("PRAGMA table_info(work_order_parts)")
        columns = [c[1] for c in cursor.fetchall()]
        if "deducted" in columns:
            print("Column 'deducted' already exists.")
            return

        cursor.execute("ALTER TABLE work_order_parts ADD COLUMN deducted BOOLEAN DEFAULT 0")
        conn.commit()
        print("Successfully added 'deducted' column to work_order_parts.")
    except sqlite3.OperationalError as e:
        print(f"Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
