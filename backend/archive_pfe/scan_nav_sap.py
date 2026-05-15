import asyncio
from app.sap.client import sap_client

async def scan():
    print("Connexion...")
    if not sap_client.login_pf(): return
    order = sap_client._pf_get("/odata/ProcessForce/MaintenanceOrder?$top=1")
    if order:
        print("\n--- CHAMPS SAP ---")
        for k in sorted(order[0].keys()):
            print(k)
    else:
        print("Aucun ordre.")

if __name__ == "__main__":
    asyncio.run(scan())
