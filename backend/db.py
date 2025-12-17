# db.py
# Async SQLAlchemy setup for FastAPI using asyncpg (Supabase + PgBouncer safe)

import os
import ssl
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL must be set in environment")

# Ensure asyncpg dialect
if DATABASE_URL.startswith("postgresql://") and "asyncpg" not in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace(
        "postgresql://",
        "postgresql+asyncpg://",
        1,
    )

# --- SSL CONTEXT (FIX) ---
# Supabase PgBouncer presents a self-signed cert chain.
# TLS is still used, but certificate verification must be relaxed.
ssl_context = ssl.create_default_context()
ssl_context.check_hostname = False
ssl_context.verify_mode = ssl.CERT_NONE
# --- END FIX ---

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    poolclass=NullPool, 
    pool_pre_ping=True,
    connect_args={
        "ssl": ssl_context,            # required for Supabase
        "statement_cache_size": 0,     # REQUIRED for PgBouncer
    },
)

AsyncSessionLocal = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

Base = declarative_base()


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
