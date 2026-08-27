-- Super Admin school management: editable school details + a unique
-- School Code, a relationship manager field, a notes feed, and activity
-- tracking (logins + module page views) for the engagement view.

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('LOGIN', 'PAGE_VIEW');

-- AlterTable: schools
ALTER TABLE "schools" ADD COLUMN "code" TEXT;
ALTER TABLE "schools" ADD COLUMN "relationship_manager" TEXT;

-- Backfill a code for any pre-existing rows before enforcing NOT NULL/unique.
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY onboarded_on) AS rn FROM "schools"
)
UPDATE "schools" s SET "code" = 'SCH-' || LPAD(n.rn::text, 4, '0')
FROM numbered n
WHERE s.id = n.id;

ALTER TABLE "schools" ALTER COLUMN "code" SET NOT NULL;

-- AlterTable: users
ALTER TABLE "users" ADD COLUMN "last_login_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "school_notes" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "school_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" TEXT NOT NULL,
    "school_id" TEXT,
    "user_id" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL,
    "module" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "school_notes_school_id_idx" ON "school_notes"("school_id");

-- CreateIndex
CREATE INDEX "activity_logs_school_id_occurred_at_idx" ON "activity_logs"("school_id", "occurred_at");

-- CreateIndex
CREATE INDEX "activity_logs_user_id_idx" ON "activity_logs"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "schools_code_key" ON "schools"("code");

-- AddForeignKey
ALTER TABLE "school_notes" ADD CONSTRAINT "school_notes_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_notes" ADD CONSTRAINT "school_notes_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
