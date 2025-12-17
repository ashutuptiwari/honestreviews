# auth_routes.py
"""
Privacy-first auth routes:
- Register (username/password) -> bcrypt stored; returns one-time recovery codes.
- Login -> returns access JWT + raw refresh token; stores HMAC(refresh_token) in user_sessions_privacy.
- Refresh -> verifies HMAC(refresh_token), issues new access token and rotates refresh token.
- Logout -> revokes session entry by HMAC(refresh_token).
- Recover -> user supplies a one-time recovery code and new password.
"""

import os
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, update, insert
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_db
from models import Profile, UserSessionPrivacy, RecoveryCode  # RecoveryCode model optional
from schemas import (
    RegisterRequest, RegisterResponse,
    LoginRequest, LoginResponse,
    RefreshRequest, LogoutRequest,
    RecoveryRequest, RecoveryCodesResponse
)
from utilities.auth_utils import (
    hash_password, verify_password,
    create_access_token, create_refresh_token_raw,
    generate_recovery_codes, hash_recovery_code, verify_recovery_code, hmac_refresh_token_hex
) 

router = APIRouter(prefix="/api/auth", tags=["auth"])

DEFAULT_REFRESH_EXPIRES_DAYS = int(os.getenv("REFRESH_EXPIRES_DAYS", "30"))
ACCESS_EXPIRES_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRES_MINUTES", "15"))

# ---------------------------------------------------------------------
# Register
# ---------------------------------------------------------------------
@router.post("/register", response_model=RegisterResponse, status_code=201)
async def register(payload: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """
    Register using username + password. No email is ever collected or stored.
    Returns:
      - profile id
      - raw recovery codes list (show to user once) as JSON under "codes" key.
    """
    # Basic validations (expand as needed)
    if len(payload.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    # Create profile with password hash
    pw_hash = hash_password(payload.password)
    new_profile = Profile(username=payload.username, display_name=payload.display_name, password_hash=pw_hash)
    db.add(new_profile)
    try:
        await db.commit()
        await db.refresh(new_profile)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Username already exists")

    # Generate one-time recovery codes and store hashed versions
    raw_codes = generate_recovery_codes()
    # Insert hashed codes into recovery_codes table
    for raw in raw_codes:
        hashed = hash_recovery_code(raw)
        # Use direct insert to recovery_codes table (model optional)
        await db.execute(
            insert(RecoveryCode).values(
                profile_id=new_profile.id,
                code_hash=hashed,
                created_at=datetime.now(timezone.utc),
                expires_at=datetime.now(timezone.utc) + timedelta(days=30)  # expiry policy
            )
        )
    await db.commit()

    # Return profile + raw recovery codes (client must save them securely)
    response = {
        "id": new_profile.id,
        "username": new_profile.username,
        "display_name": new_profile.display_name,
        "codes": raw_codes  # raw codes shown ONCE — do not store them elsewhere
    }
    # FastAPI will filter to response_model fields; codes are extra: return raw JSON
    return response

# ---------------------------------------------------------------------
# Login
# ---------------------------------------------------------------------
@router.post("/login", response_model=LoginResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    """
    Login using username + password. Issues:
      - access_token (JWT)
      - refresh_token (raw string returned to client; server stores only HMAC)
    """
    q = select(Profile).where(Profile.username == payload.username)
    res = await db.execute(q)
    profile = res.scalar_one_or_none()
    if not profile or not profile.password_hash:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not verify_password(payload.password, profile.password_hash):
        # TODO: track failed login attempts and lockout/dashboard
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Create access token and refresh token
    access_token = create_access_token(subject=str(profile.id), extra_claims={"username": profile.username})
    refresh_token_raw = create_refresh_token_raw()
    refresh_hash = hmac_refresh_token_hex(refresh_token_raw)
    expires_at = datetime.now(timezone.utc) + timedelta(days=DEFAULT_REFRESH_EXPIRES_DAYS)

    # Store hashed refresh token (privacy-first)
    session_row = UserSessionPrivacy(
        profile_id=profile.id,
        refresh_token_hash=refresh_hash,
        created_at=datetime.now(timezone.utc),
        last_used_at=datetime.now(timezone.utc),
        expires_at=expires_at,
        revoked=False
    )
    db.add(session_row)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()

    return {
        "access_token": access_token,
        "refresh_token": refresh_token_raw,
        "expires_in": ACCESS_EXPIRES_MINUTES * 60,
        "token_type": "bearer"
    }

# ---------------------------------------------------------------------
# Refresh
# ---------------------------------------------------------------------
@router.post("/refresh", response_model=LoginResponse)
async def refresh(req: RefreshRequest, db: AsyncSession = Depends(get_db)):
    presented = req.refresh_token
    presented_hash = hmac_refresh_token_hex(presented)

    q = select(UserSessionPrivacy).where(
        UserSessionPrivacy.refresh_token_hash == presented_hash,
        UserSessionPrivacy.revoked == False
    )
    res = await db.execute(q)
    session_row = res.scalar_one_or_none()
    if not session_row:
        raise HTTPException(status_code=401, detail="Invalid or revoked refresh token")

    if session_row.expires_at and session_row.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Refresh token expired")

    # Load profile
    q2 = select(Profile).where(Profile.id == session_row.profile_id)
    profile = (await db.execute(q2)).scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=401, detail="Invalid session")

    # Issue new access and rotate refresh token (recommended)
    access_token = create_access_token(subject=str(profile.id), extra_claims={"username": profile.username})
    new_refresh_raw = create_refresh_token_raw()
    new_hash = hmac_refresh_token_hex(new_refresh_raw)

    upd = update(UserSessionPrivacy).where(UserSessionPrivacy.refresh_token_hash == presented_hash).values(
        refresh_token_hash=new_hash,
        last_used_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
        expires_at=datetime.now(timezone.utc) + timedelta(days=DEFAULT_REFRESH_EXPIRES_DAYS)
    )
    await db.execute(upd)
    await db.commit()

    return {
        "access_token": access_token,
        "refresh_token": new_refresh_raw,
        "expires_in": ACCESS_EXPIRES_MINUTES * 60,
        "token_type": "bearer"
    }

# ---------------------------------------------------------------------
# Logout
# ---------------------------------------------------------------------
@router.post("/logout", status_code=204)
async def logout(req: LogoutRequest, db: AsyncSession = Depends(get_db)):
    presented = req.refresh_token
    presented_hash = hmac_refresh_token_hex(presented)
    upd = update(UserSessionPrivacy).where(UserSessionPrivacy.refresh_token_hash == presented_hash).values(
        revoked=True,
        updated_at=datetime.now(timezone.utc)
    )
    await db.execute(upd)
    await db.commit()
    return {}

# ---------------------------------------------------------------------
# Recovery - use one-time recovery code to reset password
# ---------------------------------------------------------------------
@router.post("/recover", status_code=200)
async def recover(req: RecoveryRequest, db: AsyncSession = Depends(get_db)):
    """
    Verify a one-time recovery code and set a new password.
    - On success: consume the used recovery code (set consumed_at) and update password_hash.
    - This endpoint requires only the recovery code and new password (no email).
    """
    raw_code = req.recovery_code
    new_pw = req.new_password

    if len(new_pw) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    # Find matching recovery code (we store hashed codes; must iterate)
    # Efficient approach: store code_hash per row and check bcrypt.verify against each active row.
    q = select(RecoveryCode).where(RecoveryCode.consumed_at.is_(None))
    res = await db.execute(q)
    candidates = res.scalars().all()

    matched = None
    for row in candidates:
        if verify_recovery_code(raw_code, row.code_hash):
            matched = row
            break

    if not matched:
        raise HTTPException(status_code=401, detail="Invalid or already used recovery code")

    # optional expiry check
    if matched.expires_at and matched.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Recovery code expired")

    # Load profile and update password
    q2 = select(Profile).where(Profile.id == matched.profile_id)
    profile = (await db.execute(q2)).scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Associated profile not found")

    profile.password_hash = hash_password(new_pw)
    # mark recovery code consumed
    await db.execute(
        update(RecoveryCode).where(RecoveryCode.id == matched.id).values(
            consumed_at=datetime.now(timezone.utc)
        )
    )
    await db.commit()

    return {"detail": "Password updated. You may now login using your username and new password."}
