import sqlite3
import os
from datetime import date, timedelta

db_path = "gmao-pro.db"

def seed():
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    today = date.today()
    
    # Let's seed some dates:
    # Machine 1: Overdue (past)
    # Machine 2: Due soon (within 7 days)
    # Machine 3: Not due (in 30 days)
    
    overdue = (today - timedelta(days=2)).isoformat()
    soon = (today + timedelta(days=3)).isoformat()
    ok = (today + timedelta(days=30)).isoformat()
    
    cursor.execute("UPDATE machines SET next_maintenance_date = ? WHERE id = 1", (overdue,))
    cursor.execute("UPDATE machines SET next_maintenance_date = ? WHERE id = 2", (soon,))
    cursor.execute("UPDATE machines SET next_maintenance_date = ? WHERE id = 3", (ok,))
    
    conn.commit()
    print("Seeded test maintenance dates.")
    conn.close()

if __name__ == "__main__":
    seed()
