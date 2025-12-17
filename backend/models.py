# models.py
# SQLAlchemy ORM models (cleaned + back_populates + constraints)
from sqlalchemy import (
    Column,
    String,
    Text,
    Integer,
    Boolean,
    TIMESTAMP,
    DateTime,
    ForeignKey,
    Numeric,
    func,
    CheckConstraint,
    UniqueConstraint,
    Index,
    Enum as SAEnum
)
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from db import Base
import uuid, enum

# ---------------------------------------------------------------------------
# Profile
# ---------------------------------------------------------------------------
class Profile(Base):
    __tablename__ = "profiles"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    auth_uid = Column(PG_UUID(as_uuid=True), unique=True, nullable=True)

    username = Column(String, unique=True, nullable=False, index=True)
    display_name = Column(String, nullable=True)
    bio = Column(Text, nullable=True)
    avatar_url = Column(Text, nullable=True)

    password_hash = Column(Text, nullable=True)

    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(),
                        onupdate=func.now(), nullable=False)

    # relationships
    reviews = relationship("Review", back_populates="author", lazy="selectin")
    created_personalities = relationship("Personality", back_populates="creator", lazy="selectin")
    org_memberships = relationship("OrgMembership", back_populates="member", lazy="selectin")

    def __repr__(self):
        return f"<Profile id={self.id} username={self.username!r}>"

# ---------------------------------------------------------------------------
# Organizations
# ---------------------------------------------------------------------------
class OrgRoleEnum(str, enum.Enum): 
    creator = "creator" 
    moderator = "moderator" 
    member = "member"

class Organization(Base):
    __tablename__ = "organizations"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    slug = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    created_by = Column(PG_UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="SET NULL"), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(),
                        onupdate=func.now(), nullable=False)
    
    
    members_count = Column(Integer, nullable=False, server_default="0")
    personalities_count = Column(Integer, nullable=False, server_default="0")
    reviews_count = Column(Integer, nullable=False, server_default="0")

    personalities = relationship("Personality", back_populates="organization", cascade="all, delete-orphan", lazy="selectin")
    memberships = relationship("OrgMembership", back_populates="organization", lazy="selectin")

    def __repr__(self):
        return f"<Organization id={self.id} slug={self.slug!r} name={self.name!r}>"

# ---------------------------------------------------------------------------
# OrgMemberships
# ---------------------------------------------------------------------------
class OrgMembership(Base):
    __tablename__ = "org_memberships"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id = Column(PG_UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    member_id = Column(PG_UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String, nullable=False)
    joined_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(),
                        onupdate=func.now(), nullable=False)


    # constraints: keep CHECK to mirror your SQL
    __table_args__ = (
        UniqueConstraint("org_id", "member_id", name="uniq_org_member"),
        CheckConstraint("role IN ('creator','moderator','member')", name="chk_org_role_vals"),
    )

    # relationships
    organization = relationship("Organization", back_populates="memberships")
    member = relationship("Profile", back_populates="org_memberships")

    def __repr__(self):
        return f"<OrgMembership id={self.id} org_id={self.org_id} member_id={self.member_id} role={self.role}>"

# ---------------------------------------------------------------------------
# Personalities
# ---------------------------------------------------------------------------
class Personality(Base):
    __tablename__ = "personalities"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id = Column(PG_UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String, nullable=False)
    slug = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    created_by = Column(PG_UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="SET NULL"), nullable=True)

    total_reviews = Column(Integer, nullable=False, default=0)
    average_review = Column(Numeric(6, 2), nullable=False, default=0)

    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(),
                        onupdate=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("org_id", "slug", name="uniq_personality_org_slug"),
        Index("idx_personalities_org", "org_id"),
    )

    # relationships
    organization = relationship("Organization", back_populates="personalities")
    creator = relationship("Profile", back_populates="created_personalities")
    reviews = relationship("Review", back_populates="personality", cascade="all, delete-orphan", lazy="selectin")

    def __repr__(self):
        return f"<Personality id={self.id} org_id={self.org_id} slug={self.slug!r} name={self.name!r}>"

# ---------------------------------------------------------------------------
# Reviews
# ---------------------------------------------------------------------------
class Review(Base):
    __tablename__ = "reviews"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    personality_id = Column(PG_UUID(as_uuid=True), ForeignKey("personalities.id", ondelete="CASCADE"), nullable=False, index=True)
    author_id = Column(PG_UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="SET NULL"), nullable=True, index=True)

    title = Column(Text, nullable=False)
    body = Column(Text, nullable=False)
    rating = Column(Integer, nullable=True)  # rating scale: 1–5 (validated at API & DB level)

    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(),
                        onupdate=func.now(), nullable=False)

    # relationships
    personality = relationship("Personality", back_populates="reviews")
    author = relationship("Profile", back_populates="reviews")

    def __repr__(self):
        return f"<Review id={self.id} personality_id={self.personality_id} author_id={self.author_id} rating={self.rating}>"

# ---------------------------------------------------------------------------
# User sessions & recovery codes
# ---------------------------------------------------------------------------
class UserSessionPrivacy(Base):
    __tablename__ = "user_sessions_privacy"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    profile_id = Column(PG_UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=True)
    refresh_token_hash = Column(Text, unique=True, nullable=False)

    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
    last_used_at = Column(TIMESTAMP(timezone=True), nullable=True)
    expires_at = Column(TIMESTAMP(timezone=True), nullable=True)
    revoked = Column(Boolean, nullable=False, default=False)
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(),
                        onupdate=func.now(), nullable=False)

    def __repr__(self):
        return f"<UserSessionPrivacy id={self.id} profile_id={self.profile_id} revoked={self.revoked}>"

class RecoveryCode(Base):
    __tablename__ = "recovery_codes"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    profile_id = Column(PG_UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    code_hash = Column(Text, nullable=False)

    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
    consumed_at = Column(TIMESTAMP(timezone=True), nullable=True)
    expires_at = Column(TIMESTAMP(timezone=True), nullable=True)
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(),
                        onupdate=func.now(), nullable=False)

    def __repr__(self):
        return f"<RecoveryCode id={self.id} profile_id={self.profile_id} consumed_at={self.consumed_at}>"
