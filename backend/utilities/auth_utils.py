# auth_utils.py
"""
Helpers for password hashing, JWT access tokens, refresh token generation,
and recovery code generation/verification.

Design choices:
- Passwords hashed with passlib bcrypt (salted and parameterized).
- Access tokens: JWT (HS256) signed by APP_JWT_SECRET.
- Refresh tokens: random URL-safe tokens returned raw to client; server stores HMAC(pepper, token).
- Recovery codes: random short codes shown once at registration; server stores bcrypt hash of each.
"""

import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import List
import hmac
import hashlib
import secrets
from typing import Optional
from dotenv import load_dotenv
from passlib.hash import bcrypt
import jwt

load_dotenv()

# Required env
APP_JWT_SECRET = os.getenv("APP_JWT_SECRET")
if not APP_JWT_SECRET:
    raise RuntimeError("APP_JWT_SECRET must be set in .env")

# Lifetimes (configurable)
ACCESS_TOKEN_EXPIRES_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRES_MINUTES", "15"))
REFRESH_TOKEN_EXPIRES_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRES_DAYS", "30"))
RECOVERY_CODE_COUNT = int(os.getenv("RECOVERY_CODE_COUNT", "10"))
RECOVERY_CODE_BYTES = int(os.getenv("RECOVERY_CODE_BYTES", "9"))  # ~12 chars urlsafe

# Password hashing
def hash_password(plain: str) -> str:
    # passlib bcrypt (safe defaults)
    return bcrypt.hash(plain)

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.verify(plain, hashed)

# JWT access tokens
def create_access_token(subject: str, extra_claims: dict = None) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(subject),
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=ACCESS_TOKEN_EXPIRES_MINUTES)).timestamp())
    }
    if extra_claims:
        payload.update(extra_claims)
    token = jwt.encode(payload, APP_JWT_SECRET, algorithm="HS256")
    return token

def decode_access_token(token: str) -> dict:
    # raises jwt exceptions on invalid/expired
    return jwt.decode(token, APP_JWT_SECRET, algorithms=["HS256"])

# Refresh tokens (raw token generator)
def create_refresh_token_raw(num_bytes: int = 48) -> str:
    # long random URL-safe token
    return secrets.token_urlsafe(num_bytes)

# Recovery codes: generate N short codes and return list of raw codes.
# Server must store hashed copies (use bcrypt) and only show raw list once.
def generate_recovery_codes(n: int = RECOVERY_CODE_COUNT) -> List[str]:
    return [secrets.token_urlsafe(RECOVERY_CODE_BYTES) for _ in range(n)]

def hash_recovery_code(raw_code: str) -> str:
    # bcrypt is fine for these one-time codes
    return bcrypt.hash(raw_code)

def verify_recovery_code(raw_code: str, hashed: str) -> bool:
    return bcrypt.verify(raw_code, hashed)

class MissingPepperError(RuntimeError):
    pass

def _get_pepper_bytes(override_pepper: Optional[str] = None) -> bytes:
    """
    Return the pepper as bytes. If `override_pepper` is provided, use it;
    otherwise read REFRESH_TOKEN_PEPPER from environment.
    Raises MissingPepperError if no pepper available.
    """
    pepper = override_pepper if override_pepper is not None else os.getenv("REFRESH_TOKEN_PEPPER")
    if not pepper:
        raise MissingPepperError(
            "REFRESH_TOKEN_PEPPER is not set. Set REFRESH_TOKEN_PEPPER in environment "
            "or pass override_pepper to the function."
        )
    # Use UTF-8 encoding; pepper should be high-entropy
    return pepper.encode("utf-8")

def hmac_refresh_token_hex(refresh_token: str, override_pepper: Optional[str] = None) -> str:
    """
    Compute HMAC-SHA256(refresh_token, pepper) and return a lowercase hex string.

    Args:
      refresh_token: raw refresh token string (unhashed) presented by client or generated server-side.
      override_pepper: optional string pepper for testing; in production omit so env var is used.

    Returns:
      hex string (lowercase) of the HMAC-SHA256 digest.

    Security notes:
      - REFRESH_TOKEN_PEPPER must be a server-only secret and high-entropy (32+ bytes recommended).
      - Do NOT log raw refresh tokens or their hashes.
      - Use this hex digest for indexed DB lookup (indexable). If you prefer non-indexable bcrypt,
        use a bcrypt function instead (tradeoff: cannot index).
    """
    if not isinstance(refresh_token, (str, bytes)):
        raise TypeError("refresh_token must be a str or bytes")

    pepper_bytes = _get_pepper_bytes(override_pepper)

    # Ensure token is in bytes for HMAC
    token_bytes = refresh_token.encode("utf-8") if isinstance(refresh_token, str) else refresh_token

    mac = hmac.new(pepper_bytes, token_bytes, hashlib.sha256)
    return mac.hexdigest()

def verify_refresh_token(presented_token: str, stored_hash_hex: str, override_pepper: Optional[str] = None) -> bool:
    """
    Verify that HMAC(presented_token, pepper) == stored_hash_hex using constant-time compare.

    Args:
      presented_token: raw refresh token string presented by client.
      stored_hash_hex: hex string stored in DB (result of hmac_refresh_token_hex).
      override_pepper: optional pepper for testing.

    Returns:
      True if matches and not tampered; False otherwise.
    """
    try:
        computed = hmac_refresh_token_hex(presented_token, override_pepper=override_pepper)
    except MissingPepperError:
        # bubble up or return False depending on your error handling policy;
        # here we re-raise so misconfiguration fails loudly.
        raise

    # Use secrets.compare_digest for timing-attack resistant comparison
    return secrets.compare_digest(computed, stored_hash_hex)
