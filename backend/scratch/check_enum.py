import sys
import os

def check_enum_values():
    path = "scratch/sap_metadata.xml"
    with open(path, "r", encoding="utf-8") as f:
        data = f.read()
    
    start = data.find('<EnumType Name="MaintenanceOrderStatus"')
    if start == -1:
        print("EnumType MaintenanceOrderStatus not found.")
        return
    end = data.find('</EnumType>', start) + 11
    print(data[start:end])

if __name__ == "__main__":
    check_enum_values()
