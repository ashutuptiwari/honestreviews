# routers/profile_routes.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Any

from db import get_db
from utilities.auth_dependencies import get_current_user
from models import Profile
from schemas import ProfileOut, ProfileUpdate

router = APIRouter(prefix="/api", tags=["profile"])


def _profile_to_dict(profile: Profile) -> dict:
    """
    Convert SQLAlchemy Profile to safe dict for JSON responses.
    Exclude sensitive fields (password_hash, auth_uid).
    """
    return {
        "id": str(profile.id),
        "username": profile.username,
        "display_name": profile.display_name,
        "bio": profile.bio,
        "avatar_url": profile.avatar_url,
        "created_at": profile.created_at.isoformat() if getattr(profile, "created_at", None) else None,
        "updated_at": profile.updated_at.isoformat() if getattr(profile, "updated_at", None) else None,
    }


@router.get("/profile/me", response_model=ProfileOut)
async def get_my_profile(current_user: Profile = Depends(get_current_user)):
    """
    Return the authenticated user's profile.
    """
    # current_user is the ORM Profile instance from dependency
    return _profile_to_dict(current_user)


@router.patch("/profile/me", response_model=ProfileOut)
async def update_my_profile(
    payload: ProfileUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    """
    Partially update the authenticated user's profile.
    Only accepts display_name, bio, avatar_url.
    """
    # Prepare values for update from provided payload
    update_values: dict[str, Any] = {}
    if payload.display_name is not None:
        update_values["display_name"] = payload.display_name
    if payload.bio is not None:
        update_values["bio"] = payload.bio
    if payload.avatar_url is not None:
        update_values["avatar_url"] = payload.avatar_url

    if not update_values:
        # Nothing to update
        return _profile_to_dict(current_user)

    # Perform atomic update and refresh object
    stmt = (
        update(Profile)
        .where(Profile.id == current_user.id)
        .values(**update_values)
        .returning(Profile)
    )
    try:
        res = await db.execute(stmt)
        await db.commit()
    except IntegrityError:
        await db.rollback()
        # Handle uniqueness or other integrity problems (unlikely for these fields)
        raise HTTPException(status_code=400, detail="Failed to update profile due to integrity constraints")

    updated = res.fetchone()
    if not updated:
        raise HTTPException(status_code=500, detail="Failed to update profile")

    # updated is a Row; the Profile object may be in it depending on DB driver.
    # For safety, re-query the Profile
    q = select(Profile).where(Profile.id == current_user.id)
    r = await db.execute(q)
    profile_obj = r.scalar_one_or_none()
    if profile_obj is None:
        raise HTTPException(status_code=500, detail="Profile not found after update")

    return _profile_to_dict(profile_obj)


@router.get("/profiles/{username}", response_model=ProfileOut)
async def get_public_profile(username: str, db: AsyncSession = Depends(get_db)):
    """
    Public profile view by username. No authentication required.
    Does not reveal sensitive fields.
    """
    q = select(Profile).where(Profile.username.ilike(username))
    res = await db.execute(q)
    profile = res.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return _profile_to_dict(profile)
