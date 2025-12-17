# main.py
# FastAPI app entrypoint. Includes the auth router and creates DB tables on startup (dev convenience).
# In production prefer using migrations (alembic) instead of create_all.

import os
import uvicorn
from pathlib import Path
from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.staticfiles import StaticFiles
from starlette.responses import FileResponse, Response

load_dotenv()

from db import engine, Base
from routers.auth_routes import router as auth_router
from routers.profile_routes import router as profile_router
from routers.orgs_routes import router as org_router
from routers.personalities_routes import router as personalities_router
from routers.review_routes import router as review_router

app = FastAPI(title="HonestReviews")

# ---- CORS configuration (minimal, explicit origins) ----
# Set ALLOWED_ORIGINS in your environment, comma-separated. Defaults to localhost:3000 for frontend dev.
_allowed = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000")
ALLOWED_ORIGINS = [s.strip() for s in _allowed.split(",") if s.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,  # set to True if you plan to use cookies; otherwise set to False
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    max_age=600,
)

# ---- Register routers (keeps your original includes and routing) ----
app.include_router(auth_router)
app.include_router(profile_router)
app.include_router(org_router)
app.include_router(personalities_router)
app.include_router(review_router)


# ---- Optional: serve a built frontend (SPA) if present ----
FRONTEND_DIST = os.getenv("FRONTEND_DIST", "frontend/out")
_dist_path = Path(FRONTEND_DIST)

if _dist_path.exists():
    # mount static assets (assumes assets live under FRONTEND_DIST/static)
    static_dir = _dist_path / "static"
    if static_dir.exists():
        app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa_index(full_path: str, request: Request):
        index_file = _dist_path / "index.html"
        if index_file.exists():
            # no-cache for index to ease rapid frontend deploys; adjust as needed
            return FileResponse(index_file, headers={"Cache-Control": "no-cache"})
        return Response("Frontend not built", status_code=404)
else:
    @app.get("/", include_in_schema=False)
    async def root():
        return {"status": "api-only"}


# ---- Small security headers (minimal, non-intrusive) ----
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    resp = await call_next(request)
    resp.headers.setdefault("X-Frame-Options", "DENY")
    resp.headers.setdefault("X-Content-Type-Options", "nosniff")
    return resp


# Create DB tables on startup for development convenience.
# Use migrations in production.
@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        # Create only missing tables based on SQLAlchemy models
        await conn.run_sync(Base.metadata.create_all)


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=os.getenv("APP_HOST", "0.0.0.0"),
        port=int(os.getenv("APP_PORT", "8000")),
        reload=True,
    )
