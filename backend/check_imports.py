import os, importlib, sys

sys.path.insert(0, os.path.dirname(__file__))

api_files = [f for f in os.listdir('app/api') if f.endswith('.py') and f != '__init__.py']
missing = set()

for f in api_files:
    mod = f'app.api.{f[:-3]}'
    try:
        importlib.import_module(mod)
    except ModuleNotFoundError as e:
        pkg = str(e).split("'")[1].split(".")[0]
        missing.add(pkg)
        print(f"  [{f}] Missing: {pkg}")
    except Exception as ex:
        print(f"  [{f}] Other error: {ex}")

print("\n=== MISSING PACKAGES ===")
print(" ".join(missing))
