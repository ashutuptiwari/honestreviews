# routers/orgs_routes.py
from fastapi import APIRouter, Depends, HTTPException, status, Query, Path
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update, delete
from typing import List
from uuid import UUID
import models, schemas
from db import get_db
from utilities.orgs_utils import slugify, unique_slug
from utilities.auth_dependencies import get_current_user
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/orgs", tags=["orgs"])


# ============================================================================
# LIST ALL ORGS (with sorting)
# ============================================================================
@router.get("", response_model=List[schemas.OrgOut])
async def list_orgs(
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
    search: str | None = Query(None),
    sort: str = Query("created_at"),
    order: str = Query("desc"),
):
    offset = (page - 1) * limit

    SORT_MAP = {
        "created_at": models.Organization.created_at,
        "members_count": models.Organization.members_count,
        "personalities_count": models.Organization.personalities_count,
        "reviews_count": models.Organization.reviews_count,
        "name": models.Organization.name,
    }

    if sort not in SORT_MAP:
        raise HTTPException(status_code=400, detail="Invalid sort field")

    if order not in ("asc", "desc"):
        raise HTTPException(status_code=400, detail="Invalid order")

    order_col = SORT_MAP[sort].asc() if order == "asc" else SORT_MAP[sort].desc()

    q = select(models.Organization)

    if search:
        q = q.where(func.lower(models.Organization.name).like(f"%{search.lower()}%"))

    q = q.order_by(order_col).offset(offset).limit(limit)

    res = await db.execute(q)
    return res.scalars().all()


# ============================================================================
# LIST ORG MEMBERS (authorized + sorting)
# ============================================================================
@router.get("/{slug}/members", response_model=List[schemas.OrgMemberOut])
async def list_org_members(
    slug: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    search: str | None = Query(None),
    sort: str = Query("joined_at"),
    order: str = Query("desc"),
):
    profile_id = getattr(current_user, "id", None)
    if not profile_id:
        raise HTTPException(status_code=401, detail="Authentication required")

    q_org = select(models.Organization).where(models.Organization.slug == slug)
    org = (await db.execute(q_org)).scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    # Authorization: must be org member
    q_member = select(models.OrgMembership).where(
        models.OrgMembership.org_id == org.id,
        models.OrgMembership.member_id == profile_id,
    )
    if not (await db.execute(q_member)).scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Not a member of this organization")

    SORT_MAP = {
        "joined_at": models.OrgMembership.joined_at,
        "username": models.Profile.username,
    }

    if sort not in SORT_MAP:
        raise HTTPException(status_code=400, detail="Invalid sort field")

    if order not in ("asc", "desc"):
        raise HTTPException(status_code=400, detail="Invalid order")

    order_col = SORT_MAP[sort].asc() if order == "asc" else SORT_MAP[sort].desc()
    offset = (page - 1) * limit

    q = (
        select(models.OrgMembership, models.Profile)
        .join(models.Profile, models.Profile.id == models.OrgMembership.member_id)
        .where(models.OrgMembership.org_id == org.id)
    )

    if search:
        pattern = f"%{search}%"
        q = q.where(
            models.Profile.username.ilike(pattern)
            | models.Profile.display_name.ilike(pattern)
        )

    q = q.order_by(order_col).offset(offset).limit(limit)
    res = await db.execute(q)

    return [
        schemas.OrgMemberOut(
            member_id=m.member_id,
            role=m.role,
            joined_at=m.joined_at,
            username=p.username,
            display_name=p.display_name,
            avatar_url=p.avatar_url,
        )
        for m, p in res.all()
    ]


# ============================================================================
# CREATE ORG (maintains members_count)
# ============================================================================
@router.post("", response_model=schemas.OrgOut, status_code=status.HTTP_201_CREATED)
async def create_org(
    payload: schemas.OrgCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    profile_id = getattr(current_user, "id", None)
    if not profile_id:
        raise HTTPException(status_code=400, detail="Missing profile id")

    slug = await unique_slug(db, slugify(payload.name))

    try:
        org = models.Organization(
            name=payload.name,
            description=payload.description,
            slug=slug,
            created_by=profile_id,
            members_count=1,  # creator joins immediately
        )
        db.add(org)
        await db.flush()

        db.add(
            models.OrgMembership(
                org_id=org.id,
                member_id=profile_id,
                role=models.OrgRoleEnum.creator,
            )
        )

        await db.commit()
        await db.refresh(org)
        return org
    except Exception:
        await db.rollback()
        raise


# ============================================================================
# JOIN ORG (increments members_count)
# ============================================================================
@router.post("/{slug}/join", status_code=status.HTTP_200_OK)
async def join_org(
    slug: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    profile_id = getattr(current_user, "id", None)
    if not profile_id:
        raise HTTPException(status_code=401, detail="Authentication required")

    org = (
        await db.execute(select(models.Organization).where(models.Organization.slug == slug))
    ).scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    exists = (
        await db.execute(
            select(models.OrgMembership).where(
                models.OrgMembership.org_id == org.id,
                models.OrgMembership.member_id == profile_id,
            )
        )
    ).scalar_one_or_none()

    if exists:
        return {"detail": "Already a member"}

    try:
        db.add(
            models.OrgMembership(
                org_id=org.id,
                member_id=profile_id,
                role=models.OrgRoleEnum.member,
            )
        )

        await db.execute(
            update(models.Organization)
            .where(models.Organization.id == org.id)
            .values(members_count=models.Organization.members_count + 1)
        )

        await db.commit()
        return {"detail": "Joined"}
    except Exception:
        await db.rollback()
        raise


# ============================================================================
# LIST ORGS WITH MEMBERSHIP STATUS (sorting supported)
# ============================================================================
@router.get("/with-membership", response_model=List[schemas.OrgWithMembershipOut])
async def list_orgs_with_membership(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
    search: str | None = Query(None),
    sort: str = Query("created_at"),
    order: str = Query("desc"),
):
    profile_id = getattr(current_user, "id", None)
    if not profile_id:
        raise HTTPException(status_code=401, detail="Authentication required")

    SORT_MAP = {
        "created_at": models.Organization.created_at,
        "members_count": models.Organization.members_count,
        "personalities_count": models.Organization.personalities_count,
        "reviews_count": models.Organization.reviews_count,
        "name": models.Organization.name,
    }

    if sort not in SORT_MAP:
        raise HTTPException(status_code=400, detail="Invalid sort field")

    order_col = SORT_MAP[sort].asc() if order == "asc" else SORT_MAP[sort].desc()
    offset = (page - 1) * limit

    q = select(models.Organization).options(
        selectinload(models.Organization.memberships)
    )

    if search:
        q = q.where(func.lower(models.Organization.name).like(f"%{search.lower()}%"))

    q = q.order_by(order_col).offset(offset).limit(limit)

    orgs = (await db.execute(q)).scalars().all()

    return [
        schemas.OrgWithMembershipOut.from_orm_for_user(org, profile_id)
        for org in orgs
    ]


# ============================================================================
# DELETE ORG (only creator can delete)
# ============================================================================
@router.delete("/{slug}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_org(
    slug: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    profile_id = getattr(current_user, "id", None)
    if not profile_id:
        raise HTTPException(status_code=401, detail="Authentication required")

    # Get org by slug
    org = (
        await db.execute(select(models.Organization).where(models.Organization.slug == slug))
    ).scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    # Authorization: only creator can delete
    if org.created_by != profile_id:
        raise HTTPException(
            status_code=403,
            detail="Only the organization creator can delete it"
        )

    try:
        # Delete all memberships first
        await db.execute(
            delete(models.OrgMembership).where(
                models.OrgMembership.org_id == org.id
            )
        )

        # Delete the organization
        await db.delete(org)
        await db.commit()
    except Exception as exc:
        await db.rollback()
        logger.exception("Failed to delete organization %s: %s", slug, exc)
        raise HTTPException(status_code=500, detail="Failed to delete organization")
