
import re

def extract_enums():
    path = "scratch/sap_metadata.xml"
    with open(path, "r", encoding="utf-8") as f:
        data = f.read()
    
    enums = [
        "MaintenanceOrderType",
        "MaintenanceOrderStatus",
        "PMScheduleType",
        "PMTriggeredBy",
        "YesNoType"
    ]
    
    for enum_name in enums:
        print(f"\n--- Values for {enum_name} ---")
        match = re.search(f'<EnumType Name="{enum_name}">(.*?)</EnumType>', data, re.DOTALL)
        if match:
            members = re.findall(r'<Member Name="(.*?)"', match.group(1))
            print(", ".join(members))
        else:
            print("Not found")

if __name__ == "__main__":
    extract_enums()
