
import os
import sys
from dotenv import load_dotenv

# Add backend to sys.path
sys.path.append(os.getcwd())

from app.sap.client import sap_client

load_dotenv()

if sap_client.login_pf():
    orders = sap_client.get_maintenance_orders(top=1)
    if orders:
        import json
        print(json.dumps(orders[0], indent=2))
    else:
        print("No orders found")
else:
    print("Login failed")
