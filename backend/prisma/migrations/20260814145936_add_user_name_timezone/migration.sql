-- AlterTable
ALTER TABLE "users" ADD COLUMN     "name" TEXT,
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'UTC';
