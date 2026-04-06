import sqlite3
from hashlib import sha256

def run():
    conn = sqlite3.connect("gmao-pro.db")
    c = conn.cursor()
    
    # Create parts_requests table
    c.execute("""
        CREATE TABLE IF NOT EXISTS parts_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            work_order_id INTEGER REFERENCES work_orders(id),
            requested_by INTEGER REFERENCES users(id),
            status TEXT DEFAULT 'pending',
            rejection_reason TEXT,
            approved_by INTEGER REFERENCES users(id),
            created_at TEXT,
            approved_at TEXT
        )
    """)
    
    # Create parts_request_items table
    c.execute("""
        CREATE TABLE IF NOT EXISTS parts_request_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            request_id INTEGER REFERENCES parts_requests(id),
            part_code TEXT,
            part_name TEXT,
            quantity_requested INTEGER,
            quantity_approved INTEGER
        )
    """)
    
    # Add magasinier user if not exists
    c.execute("SELECT id FROM users WHERE username = 'magasinier1'")
    if not c.fetchone():
        from app.core.security import get_password_hash
        pwd = get_password_hash("mag123")
        c.execute(
            "INSERT INTO users (username, email, password_hash, role, name) VALUES (?, ?, ?, ?, ?)",
            ("magasinier1", "mag@gmao-pro.com", pwd, "magasinier", "Magasinier Central")
        )
        print("✅ Added magasinier1 user")
    else:
        print("ℹ️  magasinier1 already exists")
    
    conn.commit()
    print("✅ Migration complete: parts_requests + parts_request_items tables created")
    conn.close()

if __name__ == "__main__":
    run()
