import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

def check_postgres():
    con = None
    try:
        # Try to connect as postgres user
        # Common defaults: no password, or 'postgres', or 'password'
        passwords = ['', 'postgres', 'password', 'admin']
        for pw in passwords:
            try:
                con = psycopg2.connect(dbname='postgres', user='postgres', host='127.0.0.1', password=pw)
                print(f"Connected as 'postgres' with password: '{pw}'")
                con.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
                cur = con.cursor()
                cur.execute("SELECT datname FROM pg_database;")
                dbs = cur.fetchall()
                print("Available databases:", [db[0] for db in dbs])
                
                # Check for gmao_db
                exists = any(db[0] == 'gmao_db' for db in dbs)
                if not exists:
                    print("gmao_db does NOT exist. Creating it...")
                    cur.execute("CREATE DATABASE gmao_db;")
                    print("Created gmao_db")
                
                # Check for gmao_user
                cur.execute("SELECT rolname FROM pg_roles;")
                roles = cur.fetchall()
                user_exists = any(role[0] == 'gmao_user' for role in roles)
                if not user_exists:
                    print("gmao_user does NOT exist. Creating it...")
                    cur.execute("CREATE USER gmao_user WITH PASSWORD 'gmao_password';")
                    cur.execute("GRANT ALL PRIVILEGES ON DATABASE gmao_db TO gmao_user;")
                    print("Created gmao_user and granted privileges")
                
                return True
            except Exception as e:
                print(f"Failed with password '{pw}': {e}")
                continue
        return False
    finally:
        if con:
            con.close()

check_postgres()
