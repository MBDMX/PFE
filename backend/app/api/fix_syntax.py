import re

with open(r'd:\PFE\gmao-platform\backend\app\api\gmao.py', 'r', encoding='utf-8') as f:
    text = f.read()

# Fix Line 401
text = re.sub(r"where=\{'id': int\(tech_id, User\.role == \"technician\"\)\}", "where={'id': tech_id}", text)

# Fix Line 408
text = re.sub(r"where=\{'technician_id': tech_id\)\.order_by\(WorkOrder\.id\.desc\(\)\}", "where={'technician_id': tech_id}, order={'id': 'desc'}", text)
text = text.replace("where={'technician_id': tech_id).order_by(WorkOrder.id.desc()})", "where={'technician_id': tech_id}, order={'id': 'desc'})")

text = text.replace("where={'equipment_id': machine.reference).order_by(WorkOrder.id.desc()})", "where={'equipment_id': machine.reference}, order={'id': 'desc'})")

text = text.replace("where={'role': \"technician\", User.manager_id == current_user.id})", "where={'role': 'technician', 'manager_id': current_user.id})")

# Find any remaining .order_by
text = re.sub(r"\)\.order_by\(([a-zA-Z0-9_]+)\.id\.desc\(\)\)", r", order={'id': 'desc'})", text)

# Fix issue in find_unique with multiple conditions
text = re.sub(r"where=\{'id': int\((.*?)\)\}", r"where={'id': \1}", text)

with open(r'd:\PFE\gmao-platform\backend\app\api\gmao.py', 'w', encoding='utf-8') as f:
    f.write(text)
print("Syntax fixes applied.")
