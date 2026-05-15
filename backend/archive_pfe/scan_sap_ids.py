import asyncio
from app.sap.client import sap_client

async def scan_sap_ids():
    print("Connexion à SAP ProcessForce...")
    if not sap_client.login_pf():
        print("ÉCHEC de connexion à SAP")
        return

    # On demande les 200 derniers ordres, triés par DocEntry pour être sûr
    url = "/odata/ProcessForce/MaintenanceOrder?$top=200&$orderby=DocEntry desc"
    print(f"Appel de l'URL : {url}")
    
    orders = sap_client._pf_get(url)
    
    if not orders or not isinstance(orders, list):
        print("Réponse SAP vide ou invalide.")
        return

    print(f"\n--- SCAN DES 200 DERNIERS ORDRES SAP ---")
    ids = [o.get("DocEntry") for o in orders]
    print(f"IDs trouvés : {sorted(ids)}")
    
    for target in [10, 11]:
        if target in ids:
            order = next(o for o in orders if o.get("DocEntry") == target)
            print(f"✅ Ordre #{target} TROUVÉ dans SAP !")
            print(f"   Machine: {order.get('U_MICode')} - {order.get('U_MIName')}")
            print(f"   Status: {order.get('U_MOStatus')}")
        else:
            print(f"❌ Ordre #{target} NON TROUVÉ dans les 200 derniers résultats SAP.")

if __name__ == "__main__":
    asyncio.run(scan_sap_ids())
