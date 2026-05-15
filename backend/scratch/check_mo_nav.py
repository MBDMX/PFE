import sys
import os

def check_mo_checklists():
    path = "scratch/sap_metadata.xml"
    with open(path, "r", encoding="utf-8") as f:
        data = f.read()
    
    start = data.find('<EntityType Name="MaintenanceOrder"')
    end = data.find('</EntityType>', start) + 13
    mo_xml = data[start:end]
    
    print("--- MaintenanceOrder Navigation Properties ---")
    pos = 0
    while True:
        pos = mo_xml.find('<NavigationProperty', pos)
        if pos == -1: break
        end_prop = mo_xml.find('/>', pos) + 2
        print(mo_xml[pos:end_prop])
        pos = end_prop

if __name__ == "__main__":
    check_mo_checklists()
