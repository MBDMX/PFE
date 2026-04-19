import sqlite3

def run_migration():
    conn = sqlite3.connect("gmao-pro.db")
    c = conn.cursor()
    
    # Check if manager_id exists
    c.execute("PRAGMA table_info(users)")
    cols = [col[1] for col in c.fetchall()]
    
    if "manager_id" not in cols:
        print("Adding manager_id to users...")
        c.execute("ALTER TABLE users ADD COLUMN manager_id INTEGER REFERENCES users(id)")
    else:
        print("manager_id already exists.")
        
    # Assign manager id 2 to the default technicians
    c.execute("UPDATE users SET manager_id = 2 WHERE role = 'technician'")
    conn.commit()
    
    print("Migration successful.", cols)
    conn.close()

if __name__ == "__main__":
    run_migration()
