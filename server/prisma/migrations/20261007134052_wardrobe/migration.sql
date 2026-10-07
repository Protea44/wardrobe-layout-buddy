-- CreateEnum
CREATE TYPE "Season" AS ENUM ('fruehling', 'sommer', 'herbst', 'winter', 'ganzjaehrig');

-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('PRIVATE', 'LINK', 'PUBLIC');

-- CreateEnum
CREATE TYPE "LifecycleStatus" AS ENUM ('ACTIVE', 'SORTED_OUT', 'SOLD', 'GIVEN_AWAY');

-- CreateEnum
CREATE TYPE "ReceiptSource" AS ENUM ('UPLOAD', 'EMAIL');

-- CreateEnum
CREATE TYPE "ParseStatus" AS ENUM ('PENDING', 'PARSED', 'FAILED', 'MANUAL');

-- CreateTable
CREATE TABLE "item" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "color" TEXT,
    "brand" TEXT,
    "size" TEXT,
    "price" DECIMAL(10,2),
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "purchaseDate" DATE,
    "material" TEXT,
    "retailer" TEXT,
    "productUrl" TEXT,
    "seasons" "Season"[],
    "notes" TEXT,
    "photoKey" TEXT,
    "thumbnailKey" TEXT,
    "receiptId" TEXT,
    "visibility" "Visibility" NOT NULL DEFAULT 'PRIVATE',
    "isForSale" BOOLEAN NOT NULL DEFAULT false,
    "isTradeable" BOOLEAN NOT NULL DEFAULT false,
    "isLinkable" BOOLEAN NOT NULL DEFAULT false,
    "lifecycleStatus" "LifecycleStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receipt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fileKey" TEXT NOT NULL,
    "source" "ReceiptSource" NOT NULL,
    "merchant" TEXT,
    "purchaseDate" DATE,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "parseStatus" "ParseStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "receipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outfit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "occasion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outfit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outfit_item" (
    "outfitId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "scale" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "zIndex" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "outfit_item_pkey" PRIMARY KEY ("outfitId","itemId")
);

-- CreateIndex
CREATE INDEX "item_userId_idx" ON "item"("userId");

-- CreateIndex
CREATE INDEX "item_userId_category_idx" ON "item"("userId", "category");

-- CreateIndex
CREATE INDEX "item_userId_brand_idx" ON "item"("userId", "brand");

-- CreateIndex
CREATE INDEX "item_receiptId_idx" ON "item"("receiptId");

-- CreateIndex
CREATE INDEX "receipt_userId_idx" ON "receipt"("userId");

-- CreateIndex
CREATE INDEX "outfit_userId_idx" ON "outfit"("userId");

-- CreateIndex
CREATE INDEX "outfit_item_itemId_idx" ON "outfit_item"("itemId");

-- AddForeignKey
ALTER TABLE "item" ADD CONSTRAINT "item_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item" ADD CONSTRAINT "item_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "receipt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipt" ADD CONSTRAINT "receipt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outfit" ADD CONSTRAINT "outfit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outfit_item" ADD CONSTRAINT "outfit_item_outfitId_fkey" FOREIGN KEY ("outfitId") REFERENCES "outfit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outfit_item" ADD CONSTRAINT "outfit_item_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "item"("id") ON DELETE CASCADE ON UPDATE CASCADE;
