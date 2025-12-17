-- ============================================================================
-- Migration: add_org_aggregates_and_rating_fix
-- Purpose:
--   1) Change review rating scale from 0–100 to 1–5
--   2) Add aggregated counts to organizations
--   3) Backfill aggregated data
--   4) Add indexes required for sorting & pagination
-- Environment:
--   Local Supabase / PostgreSQL
-- ============================================================================


-- ============================================================================
-- 1) Normalize existing review ratings into 1–5 range
--    (Prevents constraint failures)
-- ============================================================================

UPDATE reviews
SET rating =
  CASE
    WHEN rating IS NULL THEN NULL
    WHEN rating < 1 THEN 1
    WHEN rating > 5 THEN 5
    ELSE rating
  END;



-- ============================================================================
-- 2) Replace rating constraint (0–100 → 1–5)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'reviews_rating_check'
  ) THEN
    ALTER TABLE reviews DROP CONSTRAINT reviews_rating_check;
  END IF;
END$$;

ALTER TABLE reviews
  ADD CONSTRAINT reviews_rating_check
  CHECK (rating BETWEEN 1 AND 5);



-- ============================================================================
-- 3) Add aggregated count fields to organizations
-- ============================================================================

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS members_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS personalities_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reviews_count integer NOT NULL DEFAULT 0;



-- ============================================================================
-- 4) Backfill organization aggregates
-- ============================================================================

-- 4.1 Members count
UPDATE organizations o
SET members_count = sub.cnt
FROM (
  SELECT org_id, COUNT(*) AS cnt
  FROM org_memberships
  GROUP BY org_id
) sub
WHERE o.id = sub.org_id;


-- 4.2 Personalities count
UPDATE organizations o
SET personalities_count = sub.cnt
FROM (
  SELECT org_id, COUNT(*) AS cnt
  FROM personalities
  GROUP BY org_id
) sub
WHERE o.id = sub.org_id;


-- 4.3 Reviews count (via personalities)
UPDATE organizations o
SET reviews_count = sub.cnt
FROM (
  SELECT p.org_id, COUNT(r.id) AS cnt
  FROM personalities p
  JOIN reviews r ON r.personality_id = p.id
  GROUP BY p.org_id
) sub
WHERE o.id = sub.org_id;



-- ============================================================================
-- 5) Indexes for organization sorting
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_orgs_members_count
  ON organizations (members_count DESC);

CREATE INDEX IF NOT EXISTS idx_orgs_personalities_count
  ON organizations (personalities_count DESC);

CREATE INDEX IF NOT EXISTS idx_orgs_reviews_count
  ON organizations (reviews_count DESC);



-- ============================================================================
-- 6) Indexes for personalities (org-scoped search & sorting)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_personalities_org_created
  ON personalities (org_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_personalities_org_total_reviews
  ON personalities (org_id, total_reviews DESC);

CREATE INDEX IF NOT EXISTS idx_personalities_org_name_ci
  ON personalities (org_id, lower(name));



-- ============================================================================
-- 7) Indexes for org members listing
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_org_members_org_joined
  ON org_memberships (org_id, joined_at DESC);



-- ============================================================================
-- End of migration
-- ============================================================================

