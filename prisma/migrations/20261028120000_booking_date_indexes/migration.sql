-- CreateIndex
CREATE INDEX "Booking_businessId_startTime_idx" ON "Booking"("businessId", "startTime");

-- CreateIndex
CREATE INDEX "Booking_businessId_status_startTime_idx" ON "Booking"("businessId", "status", "startTime");
