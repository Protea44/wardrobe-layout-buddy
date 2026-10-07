-- AlterTable
ALTER TABLE "user" ADD COLUMN     "forwardingAlias" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "user_forwardingAlias_key" ON "user"("forwardingAlias");

