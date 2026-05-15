
import os
import sys
import json
sys.path.append(os.getcwd())
from app.sap.client import sap_client
from dotenv import load_dotenv

load_dotenv()

def inspect_mi():
    sap_client.login_pf()
    items = sap_client.get_maintainable_items(top=1)
    if items:
        print("Maintainable Item Keys:", list(items[0].keys()))
        print("Maintainable Item Data:", items[0])
    else:
        print("No items found")

if __name__ == "__main__":
    inspect_mi()
