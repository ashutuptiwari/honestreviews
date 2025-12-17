# db.py
# Async SQLAlchemy setup for FastAPI using asyncpg.
# Reads DATABASE_URL from .env (e.g. postgresql://postgres:postgres@127.0.0.1:54322/postgres)
# Use this module to import `get_db`, `engine`, and `Base` in other modules.

import os
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL must be set in environment")

# Create an async engine (SQLAlchemy 1.4+ async API)
# Note: use the asyncpg driver URI for SQLAlchemy: "postgresql+asyncpg://..."
# If your DATABASE_URL is plain postgres://, adapt to postgresql+asyncpg://
if DATABASE_URL.startswith("postgresql://") and "asyncpg" not in DATABASE_URL:
    # ensure asyncpg dialect
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

engine = create_async_engine(DATABASE_URL, future=True, echo=False)

# session factory for async sessions
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

# Declarative base class for models
Base = declarative_base()

# Dependency to use in FastAPI routes
async def get_db():
    """
    Yield an AsyncSession to be used with `async with` or `await`.
    Use like:
        async def some_route(db: AsyncSession = Depends(get_db)):
            ...
    """
    async with AsyncSessionLocal() as session:
        yield session
