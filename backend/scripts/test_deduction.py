import requests
import json

base_url = "http://localhost:4000/api"

def test_immediate_deduction():
    # 1. Check current stock of CI-M12-PNP (should be 5 based on subagent)
    res = requests.get(f"{base_url}/stock")
    stock = res.json()
    sensor = next(item for item in stock if item["reference"] == "CI-M12-PNP")
    print(f"Initial Stock: {sensor['quantity']}")
    
    # 2. Add 2 units to OT #6 (which is currently DONE, wait, let's use OT #5 which is DONE or #9 which is OPEN)
    # Actually, OT #9 is 'open'
    ot_id = 9
    print(f"Adding 2 units to OT #{ot_id}...")
    add_res = requests.post(f"{base_url}/work-orders/{ot_id}/parts", json={
        "part_code": "CI-M12-PNP",
        "quantity": 2
    })
    print(f"Add Result: {add_res.status_code} - {add_res.text}")
    
    # 3. Check stock immediately
    res = requests.get(f"{base_url}/stock")
    stock = res.json()
    sensor = next(item for item in stock if item["reference"] == "CI-M12-PNP")
    print(f"Final Stock: {sensor['quantity']}")
    
    if sensor['quantity'] == 3:
        print("SUCCESS: Immediate deduction worked!")
    else:
        print("FAILURE: Stock did not move immediately.")

if __name__ == "__main__":
    test_immediate_deduction()
