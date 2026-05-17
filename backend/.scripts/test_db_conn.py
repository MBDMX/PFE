import psycopg2
from psycopg2 import OperationalError

def test_conn():
    try:
        conn = psycopg2.connect(
            database="gmao_db",
            user="gmao_user",
            password="gmao_password",
            host="127.0.0.1",
            port="5432"
        )
        print("✅ Connexion réussie à PostgreSQL via Psycopg2 !")
        conn.close()
    except OperationalError as e:
        print(f"❌ Échec de la connexion : {e}")

if __name__ == "__main__":
    test_conn()
