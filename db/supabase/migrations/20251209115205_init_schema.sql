-- =========================================================================== 
-- Review Forum: PostgreSQL schema for "Supabase Auth" integration (Privacy-first)
-- Updated: adds application-local auth support (password_hash) and recovery codes
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 0) Required extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Optional: citext for case-insensitive columns (uncomment if desired)
-- CREATE EXTENSION IF NOT EXISTS citext;


-- ============================================================================ 
-- 1) profiles
--    - Application profile linked to Supabase Auth via auth_uid (optional).
--    - Now includes password_hash to support app-managed username/password auth
--      (bcrypt hash recommended). No email column is present or added.
--    - updated_at maintained by trigger.
-- ============================================================================ 
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),   -- application-level profile id
  auth_uid uuid UNIQUE,                            -- maps to auth.users.id (Supabase Auth), nullable
  username text NOT NULL UNIQUE,                   -- chosen handle
  display_name text,                               -- optional display
  bio text,                                        -- short biography
  avatar_url text,                                 -- CDN/storage URL for avatar
  password_hash text,                              -- bcrypt/argon2 hash of password (nullable for accounts created via external auth)
  created_at timestamptz DEFAULT now(),            -- creation timestamp (UTC)
  updated_at timestamptz DEFAULT now()             -- maintained by trigger
);

-- Useful indexes
CREATE INDEX IF NOT EXISTS idx_profiles_auth_uid
  ON profiles (auth_uid);

CREATE INDEX IF NOT EXISTS idx_profiles_username_lower
  ON profiles (lower(username));


-- Attempt to add FK to auth.users(id) for referential integrity.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_profiles_auth_users'
  ) THEN
    BEGIN
      ALTER TABLE profiles
        ADD CONSTRAINT fk_profiles_auth_users
        FOREIGN KEY (auth_uid) REFERENCES auth.users(id) ON DELETE CASCADE;
    EXCEPTION WHEN undefined_table OR undefined_object OR insufficient_privilege THEN
      RAISE NOTICE 'Skipping fk_profiles_auth_users: auth.users not accessible or insufficient privileges.';
    END;
  END IF;
END$$;


-- ============================================================================ 
-- 2) organizations
-- ============================================================================ 
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,           -- machine-friendly identifier (e.g., "acme-inc")
  name text NOT NULL,                  -- human-friendly name
  description text,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL, -- creator profile
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orgs_slug ON organizations (slug);


-- ============================================================================ 
-- 3) org_memberships
-- ============================================================================ 
CREATE TABLE IF NOT EXISTS org_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('creator','moderator','member')),
  joined_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (org_id, member_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_org_creator
  ON org_memberships (org_id)
  WHERE role = 'creator';

CREATE INDEX IF NOT EXISTS idx_org_members_org ON org_memberships (org_id);
CREATE INDEX IF NOT EXISTS idx_org_members_member ON org_memberships (member_id);


-- ============================================================================ 
-- 4) personalities
--    - Aggregates (total_reviews, average_review) kept but updated by API logic.
-- ============================================================================ 
CREATE TABLE IF NOT EXISTS personalities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,

  -- Aggregates maintained by API (not DB triggers)
  total_reviews integer NOT NULL DEFAULT 0,
  average_review numeric(6,2) NOT NULL DEFAULT 0, -- API should write rounded values

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE (org_id, slug)
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_personality_org_name_ci
  ON personalities (org_id, lower(name));

CREATE INDEX IF NOT EXISTS idx_personalities_org
  ON personalities (org_id);

CREATE INDEX IF NOT EXISTS idx_personalities_avg_review
  ON personalities (average_review DESC);


-- ============================================================================ 
-- 5) reviews
-- ============================================================================ 
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  personality_id uuid NOT NULL REFERENCES personalities(id) ON DELETE CASCADE,
  author_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  title text NOT NULL,
  body text NOT NULL,
  rating smallint CHECK (rating >= 0 AND rating <= 100),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reviews_personality_created
  ON reviews (personality_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reviews_author
  ON reviews (author_id);


-- ============================================================================ 
-- 6) attachments: intentionally omitted per request.
-- ============================================================================ 


-- ============================================================================ 
-- 7) user_sessions_privacy (privacy-first session table)
--    - Stores only hashed refresh token and non-PII metadata.
-- ============================================================================ 
CREATE TABLE IF NOT EXISTS user_sessions_privacy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  refresh_token_hash text NOT NULL UNIQUE,  -- HMAC or bcrypt hash of refresh token
  created_at timestamptz DEFAULT now(),
  last_used_at timestamptz,
  expires_at timestamptz,
  revoked boolean DEFAULT false,
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_privacy_profile ON user_sessions_privacy (profile_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_privacy_refresh_hash ON user_sessions_privacy (refresh_token_hash);


-- ============================================================================ 
-- 8) failed_login_attempts (optional)
--    - Tracks failed attempts by profile. Consider Redis for ephemeral counters.
-- ============================================================================ 
CREATE TABLE IF NOT EXISTS failed_login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  attempted_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_failed_login_user ON failed_login_attempts (profile_id);


-- ============================================================================ 
-- 9) recovery_codes (new)
--    - Stores one-time recovery codes for account recovery.
--    - Server MUST store only hashed code values (bcrypt recommended).
--    - Raw recovery codes are shown to user ONCE at registration and never stored in logs.
-- ============================================================================ 
CREATE TABLE IF NOT EXISTS recovery_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  code_hash text NOT NULL,        -- bcrypt or similar hash of the raw code (store only hash)
  created_at timestamptz DEFAULT now(),
  consumed_at timestamptz NULL,
  expires_at timestamptz NULL
);

CREATE INDEX IF NOT EXISTS idx_recovery_codes_profile ON recovery_codes (profile_id);
CREATE INDEX IF NOT EXISTS idx_recovery_codes_consumed ON recovery_codes (consumed_at);


-- ============================================================================ 
-- 10) set_updated_at trigger function and attaching triggers
--     - Keeps updated_at current on UPDATE for tables that include updated_at.
-- ============================================================================ 
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach updated_at triggers (DROP IF EXISTS then CREATE ensures idempotency)

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_personalities_updated_at ON personalities;
CREATE TRIGGER trg_personalities_updated_at
  BEFORE UPDATE ON personalities
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_reviews_updated_at ON reviews;
CREATE TRIGGER trg_reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_organizations_updated_at ON organizations;
CREATE TRIGGER trg_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_org_memberships_updated_at ON org_memberships;
CREATE TRIGGER trg_org_memberships_updated_at
  BEFORE UPDATE ON org_memberships
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_user_sessions_privacy_updated_at ON user_sessions_privacy;
CREATE TRIGGER trg_user_sessions_privacy_updated_at
  BEFORE UPDATE ON user_sessions_privacy
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_recovery_codes_updated_at ON recovery_codes;
CREATE TRIGGER trg_recovery_codes_updated_at
  BEFORE UPDATE ON recovery_codes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ============================================================================ 
-- 11) Personality aggregate triggers intentionally omitted (API will handle)
-- ============================================================================ 
-- (No recompute triggers are created here by design. See earlier notes.)


-- ============================================================================ 
-- 12) Backfill & housekeeping notes (comments only)
-- ============================================================================ 
-- If migrating from schema without password_hash, ensure existing accounts are migrated
-- safely (do NOT migrate raw passwords). For sessions stored raw previously, hash them
-- using your REFRESH_TOKEN_PEPPER before inserting into user_sessions_privacy.
--
-- To backfill personality aggregates (if needed) run the commented update (single-shot):
-- UPDATE personalities p
-- SET (total_reviews, average_review) = (
--   SELECT COUNT(r.*), COALESCE(ROUND(AVG(r.rating)::numeric,2), 0)
--   FROM reviews r WHERE r.personality_id = p.id AND r.rating IS NOT NULL
-- );
--
-- Housekeeping: periodically purge expired/consumed recovery_codes and revoked/expired sessions.


-- ============================================================================ 
-- 13) Re-ensure useful indexes (idempotent)
-- ============================================================================ 
CREATE INDEX IF NOT EXISTS idx_profiles_username_lower ON profiles (lower(username));
CREATE INDEX IF NOT EXISTS idx_orgs_slug ON organizations (slug);
CREATE INDEX IF NOT EXISTS idx_personalities_avg_review ON personalities (average_review DESC);


-- ============================================================================ 
-- 14) Operational & privacy tips (comments only)
-- ============================================================================ 
-- - For refresh_token hashing:
--     * Use HMAC_SHA256(REFRESH_TOKEN_PEPPER, token) for indexable hashed tokens, OR
--     * Use bcrypt(token) if you prefer stronger at-rest resistance (but cannot index).
-- - For recovery codes:
--     * Generate a set of one-time codes on registration, show them once, and store only bcrypt(code).
--     * Example: generate 10 codes, present to user and instruct to save offline.
-- - For failed login tracking:
--     * Consider ephemeral counters in Redis for lockout policies; keep DB table as durable fallback.
-- - Rotate REFRESH_TOKEN_PEPPER and APP_JWT_SECRET in case of compromise; plan a rotation strategy.
-- - Avoid logging raw tokens, raw recovery codes, or password material. Mask or redact sensitive fields in logs.
-- - Access control: restrict DB and Supabase service-role keys to server-side only.
-- ============================================================================

-- End of file
