import urllib.request
import json

try:
    req = urllib.request.Request('http://127.0.0.1:5000/api/stock/debug')
    response = urllib.request.urlopen(req)
    data = json.loads(response.read())
    print("DEBUG API:", json.dumps(data, indent=2))
except Exception as e:
    print(f"Error calling debug API: {e}")

try:
    req = urllib.request.Request('http://127.0.0.1:5000/api/stock')
    response = urllib.request.urlopen(req)
    print("STOCK API STATUS: 200 OK")
    data = json.loads(response.read())
    print("FIRST ITEM:", json.dumps(data[0] if data else None, indent=2))
except Exception as e:
    print(f"Error calling stock API: {e}")
