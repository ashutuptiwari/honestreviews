# routers/personalities_routes.py
from typing import List, Optional
from uuid import UUID
import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, and_, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from schemas import PersonalityCreate, PersonalityUpdate, PersonalityOut
from db import get_db
from utilities.auth_dependencies import get_current_user, require_org_role
import models
from utilities.orgs_utils import slugify

router = APIRouter(prefix="/api", tags=["personalities"])
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Helper: load organization by slug
# ---------------------------------------------------------------------------
async def get_org_by_slug(db: AsyncSession, org_slug: str) -> models.Organization:
    q = select(models.Organization).where(models.Organization.slug == org_slug)
    res = await db.execute(q)
    org = res.scalar_one_or_none()
    if org is None:
        raise HTTPException(status_code=404, detail="Organization not found")
    return org


# ---------------------------------------------------------------------------
# Create personality (increments personalities_count)
# ---------------------------------------------------------------------------
@router.post(
    "/orgs/{org_slug}/personalities",
    response_model=PersonalityOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_personality(
    org_slug: str,
    payload: PersonalityCreate,
    db: AsyncSession = Depends(get_db),
    current_profile=Depends(get_current_user),
    _auth: bool = Depends(require_org_role(lambda org_slug: org_slug, allowed_roles=["creator", "moderator"])),
):
    org = await get_org_by_slug(db, org_slug)

    base_slug = slugify(payload.name or "") or "personality"

    async def slug_exists(session: AsyncSession, org_id: UUID, candidate: str) -> bool:
        q = select(models.Personality).where(
            and_(models.Personality.org_id == org_id, models.Personality.slug == candidate)
        )
        return (await session.execute(q)).scalar_one_or_none() is not None

    for attempt in range(1, 51):
        candidate = base_slug if attempt == 1 else f"{base_slug}-{attempt}"
        if await slug_exists(db, org.id, candidate):
            continue

        try:
            p = models.Personality(
                org_id=org.id,
                name=payload.name,
                slug=candidate,
                description=payload.description,
                created_by=current_profile.id,
            )
            db.add(p)
            await db.flush()

            # increment org personality count
            await db.execute(
                update(models.Organization)
                .where(models.Organization.id == org.id)
                .values(
                    personalities_count=models.Organization.personalities_count + 1
                )
            )

            await db.commit()
            await db.refresh(p)
            return PersonalityOut.from_orm(p)

        except IntegrityError:
            await db.rollback()
            continue
        except Exception as exc:
            await db.rollback()
            logger.exception("Failed to create personality for org=%s: %s", org_slug, exc)
            raise HTTPException(status_code=500, detail="Failed to create personality")

    raise HTTPException(status_code=500, detail="Unable to generate unique slug for personality")


# ---------------------------------------------------------------------------
# List personalities (sorting added)
# ---------------------------------------------------------------------------
@router.get(
    "/orgs/{org_slug}/personalities",
    response_model=List[PersonalityOut],
)
async def list_personalities(
    org_slug: str,
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
    search: Optional[str] = Query(None),
    sort: str = Query("created_at"),
    order: str = Query("desc"),
):
    org = await get_org_by_slug(db, org_slug)
    offset = (page - 1) * limit

    SORT_MAP = {
        "created_at": models.Personality.created_at,
        "average_review": models.Personality.average_review,
        "total_reviews": models.Personality.total_reviews,
        "name": models.Personality.name,
    }

    if sort not in SORT_MAP:
        raise HTTPException(status_code=400, detail="Invalid sort field")

    if order not in ("asc", "desc"):
        raise HTTPException(status_code=400, detail="Invalid order")

    order_col = SORT_MAP[sort].asc() if order == "asc" else SORT_MAP[sort].desc()

    q = select(models.Personality).where(models.Personality.org_id == org.id)

    if search:
        pattern = f"%{search}%"
        q = q.where(
            models.Personality.name.ilike(pattern)
            | models.Personality.description.ilike(pattern)
        )

    q = q.order_by(order_col).offset(offset).limit(limit)
    res = await db.execute(q)

    return [PersonalityOut.from_orm(p) for p in res.scalars().all()]


# ---------------------------------------------------------------------------
# Get personality by slug (unchanged)
# ---------------------------------------------------------------------------
@router.get(
    "/orgs/{org_slug}/personalities/{personality_slug}",
    response_model=PersonalityOut,
)
async def get_personality_by_slug(
    org_slug: str,
    personality_slug: str,
    db: AsyncSession = Depends(get_db),
):
    org = await get_org_by_slug(db, org_slug)

    q = select(models.Personality).where(
        and_(models.Personality.org_id == org.id, models.Personality.slug == personality_slug)
    )
    p = (await db.execute(q)).scalar_one_or_none()
    if p is None:
        raise HTTPException(status_code=404, detail="Personality not found")
    return PersonalityOut.from_orm(p)


# ---------------------------------------------------------------------------
# Update personality (no aggregate impact)
# ---------------------------------------------------------------------------
@router.patch(
    "/orgs/{org_slug}/personalities/{personality_slug}",
    response_model=PersonalityOut,
)
async def update_personality_by_slug(
    org_slug: str,
    personality_slug: str,
    payload: PersonalityUpdate,
    db: AsyncSession = Depends(get_db),
    current_profile=Depends(get_current_user),
):
    org = await get_org_by_slug(db, org_slug)

    q = select(models.Personality).where(
        and_(models.Personality.org_id == org.id, models.Personality.slug == personality_slug)
    )
    existing = (await db.execute(q)).scalar_one_or_none()
    if not existing:
        raise HTTPException(status_code=404, detail="Personality not found")

    role_dep = require_org_role(lambda s: s, allowed_roles=["creator", "moderator"])
    await role_dep(current_user=current_profile, db=db, org_slug=org_slug)

    updated = False

    if "name" in payload.__fields_set__:
        existing.name = payload.name
        updated = True

    if "description" in payload.__fields_set__:
        existing.description = payload.description
        updated = True

    if updated:
        try:
            await db.commit()
            await db.refresh(existing)
        except Exception:
            await db.rollback()
            raise

    return PersonalityOut.from_orm(existing)


# ---------------------------------------------------------------------------
# Delete personality (decrements personalities_count)
# ---------------------------------------------------------------------------
@router.delete(
    "/orgs/{org_slug}/personalities/{personality_slug}",
    status_code=204,
)
async def delete_personality_by_slug(
    org_slug: str,
    personality_slug: str,
    db: AsyncSession = Depends(get_db),
    current_profile=Depends(get_current_user),
):
    org = await get_org_by_slug(db, org_slug)

    q = select(models.Personality).where(
        and_(models.Personality.org_id == org.id, models.Personality.slug == personality_slug)
    )
    p = (await db.execute(q)).scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Personality not found")

    role_dep = require_org_role(lambda s: s, allowed_roles=["creator", "moderator"])
    await role_dep(current_user=current_profile, db=db, org_slug=org_slug)

    try:
        await db.delete(p)

        await db.execute(
            update(models.Organization)
            .where(models.Organization.id == org.id)
            .values(
                personalities_count=models.Organization.personalities_count - 1
            )
        )

        await db.commit()
    except Exception as exc:
        await db.rollback()
        logger.exception("Failed to delete personality %s/%s: %s", org_slug, personality_slug, exc)
        raise HTTPException(status_code=500, detail="Failed to delete personality")

    return None
