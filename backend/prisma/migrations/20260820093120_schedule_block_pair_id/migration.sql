-- AlterTable
ALTER TABLE "schedule_blocks" ADD COLUMN     "pairId" TEXT;

-- CreateIndex
CREATE INDEX "schedule_blocks_userId_pairId_idx" ON "schedule_blocks"("userId", "pairId");
