import psycopg2
import sys

def import_sql():
    try:
        conn = psycopg2.connect(
            dbname="gmao_db",
            user="postgres",
            password="postgres",
            host="127.0.0.1",
            port="5432"
        )
        conn.autocommit = True
        cur = conn.cursor()
        
        print("Reading seed_data.sql...")
        with open("../database/seed_data.sql", "r", encoding="utf-8") as f:
            sql = f.read()
            
        print("Executing SQL import (this might take a few seconds)...")
        cur.execute(sql)
        print("SUCCESS: Full database state successfully imported from binome's SQL file!")
        
    except Exception as e:
        import traceback
        print(f"ERROR during import: {e}")
        traceback.print_exc()

    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    import_sql()
