import asyncio
import os
from dotenv import load_dotenv
from app.sap.client import sap_client

load_dotenv()

async def inspect_sap_fields():
    print("Connexion à SAP ProcessForce...")
    if not sap_client.login_pf():
        print("ÉCHEC de connexion à SAP")
        return

    print("Récupération d'un ordre de travail type...")
    orders = sap_client.get_maintenance_orders(top=1)
    
    if orders and isinstance(orders, list):
        order = orders[0]
        print("\n--- TOUS LES CHAMPS DISPONIBLES DANS UN ORDRE SAP ---")
        import json
        print(json.dumps(order, indent=2))
    else:
        print("Aucun ordre trouvé dans SAP.")

if __name__ == "__main__":
    asyncio.run(inspect_sap_fields())
