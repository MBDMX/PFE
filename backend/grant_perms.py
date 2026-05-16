import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

def grant_schema_perms():
    con = None
    try:
        con = psycopg2.connect(dbname='gmao_db', user='postgres', host='127.0.0.1', password='postgres')
        con.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cur = con.cursor()
        
        print("Granting permissions on public schema to gmao_user...")
        cur.execute("GRANT ALL ON SCHEMA public TO gmao_user;")
        cur.execute("ALTER SCHEMA public OWNER TO gmao_user;")
        print("Permissions granted.")
        
        return True
    except Exception as e:
        print(f"Failed to grant perms: {e}")
        return False
    finally:
        if con:
            con.close()

grant_schema_perms()
