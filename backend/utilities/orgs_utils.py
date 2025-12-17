# utilities/orgs_utils.py
import re
from sqlalchemy import select
from models import Organization  # adjust import path as needed
from sqlalchemy.ext.asyncio import AsyncSession

def slugify(s: str) -> str:
    s = (s or "").strip().lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = re.sub(r"-{2,}", "-", s)
    s = s.strip("-")
    return s or "org"

async def unique_slug(db: AsyncSession, base: str) -> str:
    """
    Generate a slug based on `base`. Query the `organizations` table to ensure uniqueness.
    Appends -2, -3... on collisions. This function is safe for low-concurrency; for high-concurrency
    consider DB-level retry on unique violation.
    """
    slug = base
    i = 1
    while True:
        q = select(Organization).where(Organization.slug == slug)
        res = await db.execute(q)
        if res.scalar_one_or_none() is None:
            return slug
        i += 1
        slug = f"{base}-{i}"
