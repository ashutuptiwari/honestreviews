# db.py
# Async SQLAlchemy setup for FastAPI using asyncpg
# Safe for Supabase + PgBouncer (transaction pooling)

import os
import ssl
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import NullPool

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL must be set")

# Force asyncpg dialect
if DATABASE_URL.startswith("postgresql://") and "asyncpg" not in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace(
        "postgresql://",
        "postgresql+asyncpg://",
        1,
    )

# Supabase PgBouncer uses TLS with a self-signed chain
ssl_context = ssl.create_default_context()
ssl_context.check_hostname = False
ssl_context.verify_mode = ssl.CERT_NONE

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    poolclass=NullPool,     # CRITICAL: do not retain physical connections
    pool_pre_ping=True,
    connect_args={
        "ssl": ssl_context,

        # CRITICAL: PgBouncer transaction pooling fixes
        "statement_cache_size": 0,           # disable SQLAlchemy/asyncpg cache
        "prepared_statement_cache_size": 0,  # disable asyncpg prepared stmts entirely
    },
)

AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
