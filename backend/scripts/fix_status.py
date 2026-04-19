import sqlite3
import os

db_path = "gmao-pro.db"

def fix_status():
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("UPDATE work_orders SET status = 'open' WHERE status = 'OPEN'")
    conn.commit()
    print("Fixed status case in DB.")
    conn.close()

if __name__ == "__main__":
    fix_status()
