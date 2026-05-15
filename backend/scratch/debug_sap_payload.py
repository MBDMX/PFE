
import os
import sys
import json
sys.path.append(os.getcwd())
from app.sap.client import sap_client
from dotenv import load_dotenv

load_dotenv()

def debug_sap():
    print("📡 DÉBOGAGE CRÉATION SAP MAINTENANCE ORDER")
    if not sap_client.login_pf():
        print("❌ Login failed")
        return

    # Base Payload
    base = {
        "U_Description": "DEBUG TEST OT",
        "U_MICode": "EX0208SIL"
    }

    variants = [
        {
            "name": "Minimalist (Only Desc & MICode)",
            "payload": {**base}
        },
        {
            "name": "Numeric Status & Type + Series",
            "payload": {
                **base,
                "Series": -1,
                "U_MOStatus": 1,
                "U_MOType": 1
            }
        },
        {
            "name": "String Status & Type (Case Sensitive)",
            "payload": {
                **base,
                "U_MOStatus": "WorkRequest",
                "U_MOType": "Preventive"
            }
        },
        {
            "name": "Full Date Format (ISO)",
            "payload": {
                **base,
                "U_MOStatus": "WorkRequest",
                "U_SchStartDate": "2026-05-01T00:00:00Z",
                "U_DocDate": "2026-05-01T00:00:00Z"
            }
        }
    ]

    for v in variants:
        print(f"\n--- Testing variant: {v['name']} ---")
        print(f"Payload: {json.dumps(v['payload'])}")
        url = "/odata/ProcessForce/MaintenanceOrder"
        try:
            resp = sap_client._pf_session.post(
                f"{os.getenv('SAP_PF_URL')}{url}", 
                json=v['payload'], 
                headers=sap_client._pf_headers(), 
                timeout=30
            )
            print(f"Result: {resp.status_code}")
            if resp.status_code in [200, 201]:
                print(f"✅ SUCCESS! Created DocEntry: {resp.json().get('DocEntry')}")
                # Si ça marche, on s'arrête
                return
            else:
                print(f"❌ Error: {resp.text}")
        except Exception as e:
            print(f"💥 Exception: {e}")

if __name__ == "__main__":
    debug_sap()
