# schemas.py
from pydantic import BaseModel, Field, validator
from datetime import datetime
from typing import Optional, List
from uuid import UUID
import models


# Authentication request and response models
class RegisterRequest(BaseModel):
    username: str
    password: str
    display_name: Optional[str] = None

class RegisterResponse(BaseModel):
    id: UUID
    username: str
    display_name: Optional[str] = None
    # Note: recovery_codes returned separately from API as list of strings

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    expires_in: int
    token_type: str = "bearer"

class RefreshRequest(BaseModel):
    refresh_token: str

class LogoutRequest(BaseModel):
    refresh_token: str

class RecoveryRequest(BaseModel):
    recovery_code: str
    new_password: str

class RecoveryCodesResponse(BaseModel):
    # Raw codes to show once; server will not return these again.
    codes: List[str]


# Public profile representation returned by APIs.
class ProfileOut(BaseModel):
    id: UUID
    username: str
    display_name: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    class Config:
        orm_mode = True


# Input model for partial updates to the profile.
class ProfileUpdate(BaseModel):
    display_name: Optional[str] = Field(None, min_length=1, max_length=100)
    bio: Optional[str] = Field(None, max_length=1000)
    avatar_url: Optional[str] = Field(None, max_length=1024)

    model_config = {
        "extra": "forbid",
        "str_strip_whitespace": True
    }


# Organization models
class OrgBase(BaseModel):
    name: str = Field(..., max_length=200)
    description: Optional[str] = None

class OrgCreate(OrgBase):
    pass

class OrgUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = None

class OrgOut(OrgBase):
    id: UUID
    slug: str
    created_by: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime
    members_count: int
    personalities_count: int
    reviews_count: int


    class Config:
        orm_mode = True

class OrgMemberOut(BaseModel):
    member_id: UUID
    role: str
    joined_at: datetime

    # NEW fields
    username: str
    display_name: str | None = None
    avatar_url: str | None = None

    class Config:
        orm_mode = True


# Personality models
class PersonalityBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None

    class Config:
        orm_mode = True
        extra = "forbid"


class PersonalityCreate(PersonalityBase):
    pass


class PersonalityUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None

    class Config:
        orm_mode = True
        extra = "forbid"


class PersonalityOut(BaseModel):
    id: UUID
    org_id: UUID
    name: str
    slug: str                          # returned, but not accepted from input
    description: Optional[str]
    created_by: Optional[UUID]
    total_reviews: int
    average_review: float
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True
        extra = "forbid"

# -------------------------------------------------------------------
# Shared field constraints (constants for readability)
# -------------------------------------------------------------------
USERNAME_MAX = 60
SLUG_MAX = 120
TITLE_MAX = 200
BODY_MAX = 5000
DISPLAY_NAME_MAX = 100

# -------------------------------------------------------------------
# Profile summary
# -------------------------------------------------------------------
class ProfileSummary(BaseModel):
    id: UUID
    username: str = Field(..., min_length=1, max_length=USERNAME_MAX)
    display_name: Optional[str] = Field(None, min_length=1, max_length=DISPLAY_NAME_MAX)
    avatar_url: Optional[str] = None

    class Config:
        orm_mode = True

# -------------------------------------------------------------------
# Organization summary
# -------------------------------------------------------------------
class OrganizationSummary(BaseModel):
    id: UUID
    slug: str = Field(..., min_length=1, max_length=SLUG_MAX)
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None

    class Config:
        orm_mode = True

class OrgWithMembershipOut(OrgOut):
    is_member: bool
    member_role: Optional[str]

    @classmethod
    def from_orm_for_user(
        cls,
        org: models.Organization,
        profile_id: UUID,
    ) -> "OrgWithMembershipOut":
        membership = next(
            (m for m in org.memberships if m.member_id == profile_id),
            None,
        )

        base = OrgOut.from_orm(org)

        return cls(
            **base.dict(),
            is_member=membership is not None,
            member_role=membership.role if membership else None,
        )

# -------------------------------------------------------------------
# Personality summary
# -------------------------------------------------------------------
class PersonalitySummary(BaseModel):
    id: UUID
    org_id: UUID
    name: str = Field(..., min_length=1, max_length=200)
    slug: str = Field(..., min_length=1, max_length=SLUG_MAX)
    total_reviews: int
    average_review: float

    class Config:
        orm_mode = True

# -------------------------------------------------------------------
# Review input
# -------------------------------------------------------------------
class ReviewCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=TITLE_MAX)
    body: str = Field(..., min_length=1, max_length=BODY_MAX)
    rating: Optional[int] = Field(None, ge=1, le=5)

    @validator("rating")
    def rating_integer(cls, v):
        if v is not None and not isinstance(v, int):
            raise ValueError("rating must be an integer")
        return v

class ReviewUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=TITLE_MAX)
    body: Optional[str] = Field(None, min_length=1, max_length=BODY_MAX)
    rating: Optional[int] = Field(None, ge=1, le=5)

    @validator("rating")
    def rating_integer(cls, v):
        if v is not None and not isinstance(v, int):
            raise ValueError("rating must be an integer")
        return v

# -------------------------------------------------------------------
# Review output
# -------------------------------------------------------------------
class ReviewOut(BaseModel):
    id: UUID
    personality: PersonalitySummary
    author: Optional[ProfileSummary]
    title: str
    body: str
    rating: Optional[int]
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

class ReviewListItem(BaseModel):
    id: UUID
    title: str
    rating: Optional[int]
    snippet: Optional[str]
    author: Optional[ProfileSummary]
    created_at: datetime

    class Config:
        orm_mode = True

# -------------------------------------------------------------------
# Aggregates
# -------------------------------------------------------------------
class ReviewStats(BaseModel):
    personality_id: UUID
    total_reviews: int
    average_review: float

# -------------------------------------------------------------------
# Query params (Field-based constraints)
# -------------------------------------------------------------------
class ReviewQueryParams(BaseModel):
    org_slug: Optional[str] = Field(None, min_length=1, max_length=SLUG_MAX)
    personality_slug: Optional[str] = Field(None, min_length=1, max_length=SLUG_MAX)
    author_username: Optional[str] = Field(None, min_length=1, max_length=USERNAME_MAX)

    rating_min: Optional[int] = Field(None, ge=1, le=5)
    rating_max: Optional[int] = Field(None, ge=1, le=5)

    sort: Optional[str] = Field("newest")  # newest, oldest, rating_desc, rating_asc
    limit: Optional[int] = Field(20, ge=1, le=100)
    cursor: Optional[str] = None

    class Config:
        arbitrary_types_allowed = True
