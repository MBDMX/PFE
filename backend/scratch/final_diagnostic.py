
import os
import sys
import json
sys.path.append(os.getcwd())
from app.sap.client import sap_client
from dotenv import load_dotenv

load_dotenv()

def final_diagnostic():
    sap_client.login_pf()
    url = f"{os.getenv('SAP_PF_URL')}/odata/ProcessForce/MaintenanceOrder"
    headers = sap_client._pf_headers()

    base_mandatory = {
        "U_PmSchType": "Fixed",
        "U_PmSchLineId": 0,
        "U_PmSchTriggerDate": "0001-01-01T00:00:00",
        "U_PmSchTriggerTime": "0001-01-01T00:00:00",
        "U_PmSchRequiredDate": "0001-01-01T00:00:00",
        "U_PmSchRequiredTime": "0001-01-01T00:00:00",
        "U_PmSchTriggerValue": 0.0,
        "U_PmSchRequiredValue": 0.0,
        "U_PmSchTimeBased": "No",
        "U_PmSchMeterBased": "No",
        "U_PmSchExclude": "No",
        "U_PmSchTriggeredBy": "None"
    }

    tests = [
        ("1. Titre + Machine seulement", {
            "U_Remarks": "TEST DIAG 1",
            "U_MICode": "EX02"
        }),
        ("2. Titre + Machine + PmSch (Mandatory)", {
            "U_Remarks": "TEST DIAG 2",
            "U_MICode": "EX02",
            **base_mandatory
        }),
        ("3. Titre + Machine + Enums valides", {
            "U_Remarks": "TEST DIAG 3",
            "U_MICode": "EX02",
            "U_MOType": "MaintenanceRequest",
            "U_MOStatus": "WorkRequest"
        }),
        ("4. Tout sauf les dates", {
            "U_Remarks": "TEST DIAG 4",
            "U_MICode": "EX02",
            "U_MIName": "Ligne extrudeuse -02",
            "U_MOType": "MaintenanceRequest",
            "U_MOStatus": "WorkRequest",
            **base_mandatory
        })
    ]

    for name, payload in tests:
        print(f"\n--- {name} ---")
        resp = sap_client._pf_session.post(url, json=payload, headers=headers)
        print(f"Status: {resp.status_code}")
        if resp.status_code < 300:
            print(f"✅ SUCCÈS ! DocEntry: {resp.json().get('DocEntry')}")
            break
        else:
            print(f"❌ Échec: {resp.text}")

if __name__ == "__main__":
    final_diagnostic()
