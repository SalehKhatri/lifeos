-- Backfill note: `updatedAt` is added as NOT NULL. `categories` already has
-- seeded rows, so we give the column a DEFAULT CURRENT_TIMESTAMP to backfill
-- them (Prisma's @updatedAt still explicitly sets it on every write going
-- forward — this default only matters for pre-existing rows / raw SQL).
-- `tasks` is currently empty, but the same default is added for consistency.

-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "color" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
