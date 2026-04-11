import re

def migrate_sqlalchemy_to_prisma(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        code = f.read().partition('router = APIRouter()')
        
    imports = code[0]
    body = code[2]

    # Fix imports
    imports = imports.replace('from sqlalchemy.orm import Session', 'from prisma import Prisma')
    imports = imports.replace('from sqlalchemy import', '# from sqlalchemy import')

    # Fix async defs
    body = re.sub(r'def (\w+)\(', r'async def \1(', body)
    body = body.replace('db: Session', 'db: Prisma')
    body = body.replace('db:Session', 'db: Prisma')
    
    # 1. db.query(Model).delete()
    def replace_delete(m):
        model = m.group(1).lower()
        if model == "workorder": model = "workorder"
        elif model == "partsrequestitem": model = "partsrequestitem"
        elif model == "stockmovement": model = "stockmovement"
        elif model == "workorderstep": model = "workorderstep"
        elif model == "workorderpart": model = "workorderpart"
        elif model == "partsrequest": model = "partsrequest"
        return f"await db.{model}.delete_many()"
    body = re.sub(r'db\.query\((\w+)\)\.delete\(\)', replace_delete, body)

    # 2. db.query(Model).all()
    def replace_all(m):
        model = m.group(1).lower()
        return f"await db.{model}.find_many()"
    body = re.sub(r'db\.query\((\w+)\)\.all\(\)', replace_all, body)
    
    # 3. db.query(Model).count()
    body = re.sub(r'db\.query\((\w+)\)\.count\(\)', lambda m: f"await db.{m.group(1).lower()}.count()", body)

    # 4. db.query(Model).filter(Model.field == val).all()
    # E.g. db.query(User).filter(User.role == "technician").all()
    body = re.sub(r'db\.query\((\w+)\)\.filter\(\w+\.(\w+) == (.*?)\)\.all\(\)', 
                  lambda m: f"await db.{m.group(1).lower()}.find_many(where={{{m.group(2)!r}: {m.group(3)}}})", body)

    # 5. db.query(Model).filter(Model.id == val).first()
    body = re.sub(r'db\.query\((\w+)\)\.filter\(\w+\.(id) == (.*?)\)\.first\(\)',
                  lambda m: f"await db.{m.group(1).lower()}.find_unique(where={{'id': int({m.group(3)})}})", body)

    # 6. db.commit() and flush()
    body = body.replace('db.commit()', '# db.commit()')
    body = body.replace('db.flush()', '# db.flush()')
    
    # 7. db.add(obj) -> Create syntax is completely different, we comment it to find it later
    body = body.replace('db.add(', '# db.add(')
    body = body.replace('db.add_all(', '# db.add_all(')

    new_code = imports + 'router = APIRouter()\n' + body

    with open(f"{file_path}.migrated", 'w', encoding='utf-8') as f:
        f.write(new_code)
    print("Migration (Pass 1) saved to", f"{file_path}.migrated")

if __name__ == "__main__":
    migrate_sqlalchemy_to_prisma('gmao.py')
