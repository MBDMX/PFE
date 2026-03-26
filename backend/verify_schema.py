import sqlite3
import os

db_path = "gmao-pro.db"

def verify():
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("PRAGMA table_info(machines)")
    columns = [c[1] for c in cursor.fetchall()]
    print(f"Columns in machines table: {columns}")
    conn.close()

if __name__ == "__main__":
    verify()
