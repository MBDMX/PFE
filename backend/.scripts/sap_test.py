import requests
import urllib3
import os
from dotenv import load_dotenv

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
load_dotenv()

def test_sap_connection():
    sl_url = os.getenv("SAP_SL_URL")
    db = os.getenv("SAP_COMPANY_DB")
    user = os.getenv("SAP_USERNAME")
    pw = os.getenv("SAP_PASSWORD")
    
    print(f"--- Diagnostic SAP ---")
    print(f"URL: {sl_url}")
    print(f"DB:  {db}")
    print(f"User:{user}")
    
    payload = {
        "CompanyDB": db,
        "UserName": user,
        "Password": pw
    }
    
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0"
    }
    
    try:
        # Test 1: Simple Login
        print("\nTest 1: Tentative de Login...")
        resp = requests.post(f"{sl_url}/Login", json=payload, headers=headers, verify=False, timeout=10)
        print(f"Status Code: {resp.status_code}")
        if resp.status_code == 200:
            print("✅ Login Réussi !")
            session_id = resp.cookies.get("B1SESSION")
            print(f"Session ID: {session_id[:10]}...")
        else:
            print(f"❌ Échec Login: {resp.text}")
            
        # Test 2: Si échec v2, tenter sans en-têtes OData
        if resp.status_code != 200:
            print("\nTest 2: Tentative sans en-têtes OData...")
            resp = requests.post(f"{sl_url}/Login", json=payload, verify=False, timeout=10)
            print(f"Status Code: {resp.status_code}")
            if resp.status_code == 200:
                print("✅ Login Réussi sans OData headers !")
            else:
                print(f"❌ Échec persistant: {resp.text}")

    except Exception as e:
        print(f"🚨 Erreur de connexion: {e}")

if __name__ == "__main__":
    test_sap_connection()
