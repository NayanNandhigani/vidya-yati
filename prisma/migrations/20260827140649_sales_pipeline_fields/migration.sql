-- CreateEnum
CREATE TYPE "SalesStage" AS ENUM ('LEAD', 'DEMO_SCHEDULED', 'PROPOSAL_SENT', 'NEGOTIATION', 'WON');

-- AlterTable
ALTER TABLE "schools" ADD COLUMN     "last_contacted_at" TIMESTAMP(3),
ADD COLUMN     "lead_source" TEXT,
ADD COLUMN     "next_follow_up_at" TIMESTAMP(3),
ADD COLUMN     "sales_stage" "SalesStage" NOT NULL DEFAULT 'WON';
