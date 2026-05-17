import os
import psycopg2

DATABASE_URL = "postgresql://gmao_user:gmao_password@localhost:5432/gmao_db"

def main():
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()
        
        cursor.execute("SELECT id, name, reference, quantity, unit_price FROM stock_items LIMIT 50;")
        rows = cursor.fetchall()
        
        print(f"{'ID':<5} | {'Reference':<15} | {'Quantity':<8} | {'Unit Price':<12} | {'Name'}")
        print("-" * 80)
        total_val = 0.0
        for r in rows:
            uid, name, ref, qty, price = r
            qty = qty or 0
            price = price or 0.0
            val = qty * price
            total_val += val
            print(f"{uid:<5} | {ref:<15} | {qty:<8} | {price:<12.3f} | {name}")
            
        print("-" * 80)
        print(f"Total computed in Python: {total_val:.3f} TND")
        
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"Error checking DB: {e}")

if __name__ == "__main__":
    main()
