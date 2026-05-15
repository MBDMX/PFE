import sys
import os

def extract_specific_task():
    path = "scratch/sap_metadata.xml"
    with open(path, "r", encoding="utf-8") as f:
        data = f.read()

    # On cherche l'EntityType qui est dans le namespace MaintenanceOrder
    # Souvent ils sont regroupés par Schema Namespace
    
    # On va chercher "MaintenanceOrder.Task" ou juste voir les propriétés de l'entité Task liée à MaintenanceOrder
    # Dans OData V4, les types complexes ou entités liées sont définies.
    
    print("🔬 Recherche de la structure interne de MaintenanceOrder.Task...")
    # On va chercher la balise EntityType qui suit celle de MaintenanceOrder ou qui contient Checklist
    start = data.find('<EntityType Name="Task"')
    # Si on en trouve plusieurs, on les affiche
    pos = 0
    while True:
        pos = data.find('<EntityType Name="Task"', pos)
        if pos == -1: break
        end = data.find('</EntityType>', pos) + 13
        print(f"\n--- EntityType Task at pos {pos} ---")
        print(data[pos:end])
        pos = end

if __name__ == "__main__":
    extract_specific_task()
