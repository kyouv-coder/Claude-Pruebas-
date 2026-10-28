-- CreateIndex
CREATE INDEX "GiftCard_businessId_createdAt_idx" ON "GiftCard"("businessId", "createdAt");

-- CreateIndex
CREATE INDEX "GiftCard_businessId_expiresAt_idx" ON "GiftCard"("businessId", "expiresAt");

