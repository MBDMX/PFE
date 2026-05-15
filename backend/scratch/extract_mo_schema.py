
import os

path = "scratch/sap_metadata.xml"
with open(path, "r", encoding="utf-8") as f:
    data = f.read()

start_tag = '<EntityType Name="MaintenanceOrder"'
start = data.find(start_tag)
if start != -1:
    end = data.find("</EntityType>", start) + 13
    with open("scratch/mo_schema.xml", "w", encoding="utf-8") as f:
        f.write(data[start:end])
    print("Success")
else:
    print("Not found")
