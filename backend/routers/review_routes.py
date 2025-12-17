from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status, Query, Path, Request
from typing import Optional, List, Tuple
from uuid import UUID
from datetime import datetime
import base64
import logging

from sqlalchemy import select, update, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy.exc import IntegrityError

from db import get_db
from utilities.auth_dependencies import get_current_user

from models import Profile, Organization, Personality, Review, OrgMembership
from schemas import (
    ReviewCreate,
    ReviewOut,
    ReviewListItem,
    ReviewUpdate,
    ReviewStats,
    PersonalitySummary,
    ProfileSummary,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["reviews"])


# ============================================================================
# Cursor helpers
# ============================================================================
def _encode_cursor(created_at: datetime, review_id: UUID) -> str:
    token = f"{created_at.isoformat()}|{str(review_id)}"
    return base64.urlsafe_b64encode(token.encode()).decode()


def _decode_cursor(cursor: str) -> Tuple[datetime, UUID]:
    try:
        raw = base64.urlsafe_b64decode(cursor.encode()).decode()
        ts_str, id_str = raw.split("|", 1)
        return datetime.fromisoformat(ts_str), UUID(id_str)
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Invalid cursor") from exc


# ============================================================================
# Utilities
# ============================================================================
async def is_org_member(session: AsyncSession, org_id: UUID, profile_id: UUID) -> bool:
    stmt = select(OrgMembership).where(
        OrgMembership.org_id == org_id,
        OrgMembership.member_id == profile_id,
    )
    return (await session.execute(stmt)).scalar_one_or_none() is not None


async def is_org_moderator(session: AsyncSession, org_id: UUID, profile_id: UUID) -> bool:
    stmt = select(OrgMembership).where(
        OrgMembership.org_id == org_id,
        OrgMembership.member_id == profile_id,
        OrgMembership.role.in_(["creator", "moderator"]),
    )
    return (await session.execute(stmt)).scalar_one_or_none() is not None


async def resolve_personality_by_slugs(
    org_slug: str,
    personality_slug: str,
    session: AsyncSession,
) -> Personality:
    stmt = (
        select(Personality)
        .join(Organization, Organization.id == Personality.org_id)
        .where(
            Organization.slug == org_slug,
            Personality.slug == personality_slug,
        )
        .options(selectinload(Personality.organization))
    )
    personality = (await session.execute(stmt)).scalar_one_or_none()
    if not personality:
        raise HTTPException(status_code=404, detail="Personality not found")
    return personality


# ============================================================================
# CREATE REVIEW (updates personality + organization aggregates)
# ============================================================================
@router.post(
    "/orgs/{org_slug}/personalities/{personality_slug}/reviews",
    response_model=ReviewOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_review_for_personality(
    request: Request,
    org_slug: str,
    personality_slug: str,
    payload: ReviewCreate,
    db: AsyncSession = Depends(get_db),
    current_profile: Profile = Depends(get_current_user),
):
    personality = await resolve_personality_by_slugs(org_slug, personality_slug, db)

    if not await is_org_member(db, personality.organization.id, current_profile.id):
        raise HTTPException(
            status_code=403,
            detail="Only members of the organization can create reviews",
        )

    review = Review(
        personality_id=personality.id,
        author_id=current_profile.id,
        title=payload.title,
        body=payload.body,
        rating=payload.rating,
    )

    try:
        db.add(review)
        await db.flush()

        if payload.rating is not None:
            stmt_lock = (
                select(Personality)
                .where(Personality.id == personality.id)
                .with_for_update()
            )
            p = (await db.execute(stmt_lock)).scalar_one()

            old_total = int(p.total_reviews or 0)
            old_avg = float(p.average_review or 0.0)

            new_total = old_total + 1
            new_avg = round(
                ((old_avg * old_total) + payload.rating) / new_total, 2
            )

            p.total_reviews = new_total
            p.average_review = new_avg
            db.add(p)

        await db.execute(
            update(Organization)
            .where(Organization.id == personality.organization.id)
            .values(reviews_count=Organization.reviews_count + 1)
        )

        await db.commit()
        await db.refresh(review)

    except Exception as exc:
        await db.rollback()
        logger.exception("Failed to create review: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to create review")

    stmt = (
        select(Review)
        .where(Review.id == review.id)
        .options(
            selectinload(Review.personality).selectinload(Personality.organization),
            selectinload(Review.author),
        )
    )
    created = (await db.execute(stmt)).scalar_one()

    return ReviewOut(
        id=created.id,
        personality=PersonalitySummary.from_orm(created.personality),
        author=ProfileSummary.from_orm(created.author) if created.author else None,
        title=created.title,
        body=created.body,
        rating=created.rating,
        created_at=created.created_at,
        updated_at=created.updated_at,
    )


# ============================================================================
# LIST REVIEWS (cursor pagination, rating 1–5)
# ============================================================================
@router.get(
    "/orgs/{org_slug}/personalities/{personality_slug}/reviews",
    response_model=dict,
)
async def list_reviews_for_personality(
    org_slug: str,
    personality_slug: str,
    limit: int = Query(20, ge=1, le=100),
    cursor: Optional[str] = Query(None),
    sort: str = Query("newest", regex="^(newest|oldest|rating_desc|rating_asc)$"),
    rating_min: Optional[int] = Query(None, ge=1, le=5),
    rating_max: Optional[int] = Query(None, ge=1, le=5),
    db: AsyncSession = Depends(get_db),
):
    personality = await resolve_personality_by_slugs(org_slug, personality_slug, db)

    q = select(Review).where(Review.personality_id == personality.id)

    if rating_min is not None:
        q = q.where(Review.rating >= rating_min)
    if rating_max is not None:
        q = q.where(Review.rating <= rating_max)

    if sort == "newest":
        q = q.order_by(Review.created_at.desc(), Review.id.desc())
    elif sort == "oldest":
        q = q.order_by(Review.created_at.asc(), Review.id.asc())
    elif sort == "rating_desc":
        q = q.order_by(Review.rating.desc().nullslast(), Review.created_at.desc())
    elif sort == "rating_asc":
        q = q.order_by(Review.rating.asc().nullsfirst(), Review.created_at.desc())

    if cursor:
        created_at_cur, id_cur = _decode_cursor(cursor)
        q = q.where(
            (Review.created_at < created_at_cur)
            | ((Review.created_at == created_at_cur) & (Review.id < id_cur))
        )

    q = q.options(selectinload(Review.author)).limit(limit + 1)
    rows = (await db.execute(q)).scalars().all()

    next_cursor = None
    if len(rows) > limit:
        last = rows[limit - 1]
        next_cursor = _encode_cursor(last.created_at, last.id)
        rows = rows[:limit]

    items = [
        ReviewListItem(
            id=r.id,
            title=r.title,
            rating=r.rating,
            snippet=(r.body[:200] + "...") if len(r.body) > 200 else r.body,
            author=ProfileSummary.from_orm(r.author) if r.author else None,
            created_at=r.created_at,
        )
        for r in rows
    ]

    return {
        "items": items,
        "next_cursor": next_cursor,
        "stats": ReviewStats(
            personality_id=personality.id,
            total_reviews=personality.total_reviews,
            average_review=float(personality.average_review or 0.0),
        ),
    }


# ============================================================================
# UPDATE REVIEW (recalculates personality aggregates)
# ============================================================================
@router.patch("/reviews/{review_id}", response_model=ReviewOut)
async def update_review(
    review_id: UUID,
    payload: ReviewUpdate,
    db: AsyncSession = Depends(get_db),
    current_profile: Profile = Depends(get_current_user),
):
    stmt = (
        select(Review)
        .where(Review.id == review_id)
        .options(selectinload(Review.personality))
    )
    review = (await db.execute(stmt)).scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    if review.author_id != current_profile.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    old_rating = review.rating

    try:
        if payload.rating is not None and payload.rating != old_rating:
            stmt_lock = (
                select(Personality)
                .where(Personality.id == review.personality_id)
                .with_for_update()
            )
            p = (await db.execute(stmt_lock)).scalar_one()

            total = int(p.total_reviews or 0)
            old_avg = float(p.average_review or 0.0)

            new_avg = round(
                ((old_avg * total) + payload.rating - (old_rating or 0)) / total,
                2,
            )

            p.average_review = new_avg
            review.rating = payload.rating
            db.add(p)

        if payload.title is not None:
            review.title = payload.title
        if payload.body is not None:
            review.body = payload.body

        await db.commit()
        await db.refresh(review)

    except Exception:
        await db.rollback()
        raise HTTPException(status_code=500, detail="Failed to update review")

    return ReviewOut.from_orm(review)


# ============================================================================
# DELETE REVIEW (updates personality + organization aggregates)
# ============================================================================
@router.delete("/reviews/{review_id}", status_code=204)
async def delete_review(
    review_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_profile: Profile = Depends(get_current_user),
):
    stmt = (
        select(Review)
        .where(Review.id == review_id)
        .options(selectinload(Review.personality))
    )
    review = (await db.execute(stmt)).scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    if not (
        review.author_id == current_profile.id
        or await is_org_moderator(db, review.personality.org_id, current_profile.id)
    ):
        raise HTTPException(status_code=403, detail="Not authorized")

    try:
        if review.rating is not None:
            stmt_lock = (
                select(Personality)
                .where(Personality.id == review.personality_id)
                .with_for_update()
            )
            p = (await db.execute(stmt_lock)).scalar_one()

            total = int(p.total_reviews or 0)
            old_avg = float(p.average_review or 0.0)

            if total <= 1:
                p.total_reviews = 0
                p.average_review = 0
            else:
                p.total_reviews = total - 1
                p.average_review = round(
                    ((old_avg * total) - review.rating) / (total - 1), 2
                )

            db.add(p)

        await db.delete(review)

        await db.execute(
            update(Organization)
            .where(Organization.id == review.personality.org_id)
            .values(reviews_count=Organization.reviews_count - 1)
        )

        await db.commit()

    except Exception:
        await db.rollback()
        raise HTTPException(status_code=500, detail="Failed to delete review")

    return None
