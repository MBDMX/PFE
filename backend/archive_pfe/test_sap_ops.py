import asyncio
from app.sap.client import sap_client

async def inspect_operations():
    if not sap_client.login_pf():
        print("ÉCHEC de connexion à SAP")
        return

    # On essaie de récupérer les opérations du premier ordre
    # Dans OData SAP, on utilise souvent $expand pour avoir les lignes
    endpoint = "/odata/ProcessForce/MaintenanceOrder?$top=1&$expand=MaintenanceOrderOperations"
    print(f"Tentative d'accès aux opérations via : {endpoint}")
    
    order_with_ops = sap_client._pf_get(endpoint)
    
    if order_with_ops and isinstance(order_with_ops, list):
        order = order_with_ops[0]
        ops = order.get("MaintenanceOrderOperations", [])
        print(f"\n--- OPÉRATIONS TROUVÉES POUR L'ORDRE #{order.get('DocEntry')} ---")
        if not ops:
            print("Aucune opération trouvée (liste vide).")
        else:
            for i, op in enumerate(ops):
                print(f"Étape {i+1}: {op.get('U_Description')} (ID: {op.get('LineId')})")
    else:
        print("Impossible de récupérer l'ordre ou les opérations.")

if __name__ == "__main__":
    asyncio.run(inspect_operations())
