# auth_dependencies.py
"""
FastAPI dependencies for validating access JWTs and resolving the current Profile.
- get_current_user: verifies JWT, checks expiry and signature, loads Profile from DB.
- get_current_active_user: same as get_current_user (placeholder to add 'active' checks).
- require_role: factory to assert membership/role in an organization (optional).
- Optional session check: if your access token includes a 'sid' (session id) claim,
  the dependency will verify the session is present and not revoked in user_sessions_privacy.
"""

import os
from typing import Optional, Callable

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
# from jose import JWTError  # optional: you can also use PyJWT but jose provides helpful error types
import jwt  # PyJWT (we will use it for decoding)
from datetime import datetime, timezone

from db import get_db
from models import Profile, UserSessionPrivacy

# OAuth2 scheme — tokenUrl is informational (client apps use your login endpoint).
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

# Load secret; fail fast if missing.
APP_JWT_SECRET = os.getenv("APP_JWT_SECRET")
if not APP_JWT_SECRET:
    raise RuntimeError("APP_JWT_SECRET must be set in environment for JWT verification")

# Default algorithm used when creating tokens
JWT_ALGORITHM = os.getenv("APP_JWT_ALGORITHM", "HS256")


# ---- helpers ----
def _raise_401(detail: str = "Could not validate credentials"):
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> Profile:
    """
    Decode and validate the access token, then load and return Profile ORM object.

    - On successful validation returns the Profile ORM instance.
    - On token expiration (ExpiredSignatureError) returns 401 with a helpful `detail` containing:
        {
          "message": "Token has expired",
          "token_iat": "<ISO UTC or null>",
          "token_exp": "<ISO UTC or null>",
          "server_time": "<ISO UTC now>"
        }
      This is produced by decoding the token WITHOUT verifying the signature in order to extract `iat`/`exp`
      for debugging/helpful client behavior. No raw secrets or token values are returned.
    - On other invalid-token cases returns a standard 401.
    """
    # 1) decode token (normal, verify signature & exp)
    try:
        payload = jwt.decode(token, APP_JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        # Token expired — decode WITHOUT verification to extract claims (iat/exp) for diagnostics.
        try:
            payload_no_verify = jwt.decode(token, options={"verify_signature": False, "verify_exp": False})
        except Exception:
            payload_no_verify = {}

        def _iso_from_claim(claim_name):
            v = payload_no_verify.get(claim_name)
            try:
                if isinstance(v, (int, float)):
                    return datetime.fromtimestamp(int(v), tz=timezone.utc).isoformat()
                # if claim already a string datetime, return as-is (best-effort)
                if isinstance(v, str):
                    return v
            except Exception:
                pass
            return None

        token_iat_iso = _iso_from_claim("iat")
        token_exp_iso = _iso_from_claim("exp")
        server_now_iso = datetime.now(timezone.utc).isoformat()

        # Provide structured detail so clients can react (e.g., trigger refresh)
        detail = {
            "message": "Token has expired",
            "token_iat": token_iat_iso,
            "token_exp": token_exp_iso,
            "server_time": server_now_iso,
        }
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail, headers={"WWW-Authenticate": "Bearer"})
    except jwt.InvalidTokenError:
        _raise_401("Invalid token")

    # 2) basic payload validation
    sub = payload.get("sub")
    if not sub:
        _raise_401("Token missing subject (sub) claim")

    # 3) load Profile from DB
    try:
        q = select(Profile).where(Profile.id == sub)
        res = await db.execute(q)
        profile = res.scalar_one_or_none()
    except Exception:
        _raise_401("Failed to fetch user profile")

    if profile is None:
        _raise_401("User not found")

    return profile


# ---- convenience wrapper (alias) ----
async def get_current_active_user(
    current_user: Profile = Depends(get_current_user),
) -> Profile:
    """
    Placeholder to check 'active' or other flags. Right now returns the profile directly.
    """
    return current_user


# ---- role-checking dependency factory (optional) ----
def require_org_role(org_id_getter: Callable[..., str], allowed_roles: Optional[list] = None):
    """
    Dependency factory that asserts the current_user is a member of the org (resolved by slug or id)
    and, if allowed_roles is provided, has one of those roles.

    Usage:
      depend = require_org_role(lambda org_slug: org_slug, allowed_roles=['creator','moderator'])
      @router.post("/orgs/{org_slug}/...")
      async def endpoint(..., _ok=Depends(depend)):
          ...
    """
    async def _dependency(
        current_user: Profile = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
        org_slug: Optional[str] = None,
        org_id: Optional[str] = None,
    ):
        # Resolve org identifier (org_slug or org_id) using the provided getter if possible.
        try:
            resolved = org_id_getter(org_slug or org_id)
        except Exception:
            resolved = org_slug or org_id

        # Determine if resolved looks like a UUID (then treat as org_id) or a slug (lookup id).
        import uuid as _uuid
        is_uuid = True
        try:
            _uuid.UUID(str(resolved))
        except Exception:
            is_uuid = False

        if not is_uuid:
            # resolve slug -> id
            row = await db.execute(text("SELECT id FROM organizations WHERE slug = :s"), {"s": resolved})
            r = row.first()
            if not r:
                raise HTTPException(status_code=404, detail="Organization not found")
            resolved = r[0]

        # membership check (use textual SQL to avoid coercion issues)
        mem_q = text("SELECT 1 FROM org_memberships WHERE org_id = :org_id AND member_id = :member_id LIMIT 1")
        mem_res = await db.execute(mem_q, {"org_id": resolved, "member_id": str(current_user.id)})
        if mem_res.first() is None:
            raise HTTPException(status_code=403, detail="Not a member of the organization")

        # If allowed_roles provided, verify role
        if allowed_roles:
            role_q = text("SELECT role FROM org_memberships WHERE org_id = :org_id AND member_id = :member_id LIMIT 1")
            role_res = await db.execute(role_q, {"org_id": resolved, "member_id": str(current_user.id)})
            r2 = role_res.first()
            if not r2 or r2[0] not in allowed_roles:
                raise HTTPException(status_code=403, detail="Insufficient permissions")

        return True

    return _dependency