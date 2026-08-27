-- Switch login credential from email to username.
-- Added nullable first and backfilled (rather than a straight NOT NULL add)
-- in case this runs against a DB that already has seeded rows.

ALTER TABLE "users" ADD COLUMN "username" TEXT;

-- Backfill from the existing email's local part for any pre-existing rows.
UPDATE "users" SET "username" = LOWER(SPLIT_PART("email", '@', 1)) WHERE "username" IS NULL AND "email" IS NOT NULL;

-- De-duplicate any backfilled usernames that collided (e.g. two different
-- email domains sharing a local part) by suffixing with a row number.
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY username ORDER BY id) AS rn
  FROM "users"
  WHERE username IS NOT NULL
)
UPDATE "users" u SET "username" = u."username" || '-' || r.rn
FROM ranked r
WHERE u.id = r.id AND r.rn > 1;

-- Anything still without a username (no email on the row) falls back to its id.
UPDATE "users" SET "username" = LOWER(id) WHERE "username" IS NULL;

ALTER TABLE "users" ALTER COLUMN "username" SET NOT NULL;
ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;

CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
