# paste & run in the same Python env as your app
from importlib import import_module
# adjust to how you import your FastAPI app; common: from app.main import app
from main import app

for r in app.routes:
    methods = ",".join(sorted(getattr(r, "methods", [])))
    print(f"{r.path}    [{methods}]    name={r.name}")
