import sys
import os
sys.path.append(os.getcwd())
from app.sap.client import sap_client
from dotenv import load_dotenv

load_dotenv()

def get_metadata():
    print("📡 Récupération des métadonnées OData de ProcessForce...")
    if not sap_client.login_pf():
        print("❌ Échec de la connexion")
        return

    url = f"{os.getenv('SAP_PF_URL')}/odata/ProcessForce/$metadata"
    try:
        resp = sap_client._pf_session.get(url, headers=sap_client._pf_headers(), timeout=60)
        if resp.status_code == 200:
            with open("scratch/sap_metadata.xml", "w", encoding="utf-8") as f:
                f.write(resp.text)
            print("✅ Métadonnées sauvegardées dans scratch/sap_metadata.xml")
            
            # On cherche la définition de l'entité Task
            if "<EntityType Name=\"Task\"" in resp.text:
                print("🔎 Définition de l'entité 'Task' trouvée !")
                start = resp.text.find("<EntityType Name=\"Task\"")
                end = resp.text.find("</EntityType>", start) + 13
                print(resp.text[start:end])
            else:
                print("⚠️ Entité 'Task' non trouvée dans les métadonnées.")
        else:
            print(f"❌ Erreur {resp.status_code}: {resp.text[:200]}")
    except Exception as e:
        print(f"❌ Erreur : {e}")

if __name__ == "__main__":
    get_metadata()
