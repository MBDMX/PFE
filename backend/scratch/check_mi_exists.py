
import os
import sys
import json
sys.path.append(os.getcwd())
from app.sap.client import sap_client
from dotenv import load_dotenv

load_dotenv()

def check_item():
    sap_client.login_pf()
    code = "EX0208SIL02"
    url = f"/odata/ProcessForce/MaintainableItem?$filter=U_MICode eq '{code}'"
    res = sap_client._pf_get(url)
    print(f"Search for {code}:")
    print(json.dumps(res, indent=2))

if __name__ == "__main__":
    check_item()
