-- Multi-tenant: introduce Business and scope every table to it.
--
-- Written by hand (not `prisma migrate diff`) because this database already
-- has real rows from testing. A naive "ADD COLUMN businessId TEXT NOT NULL"
-- would fail outright, or worse, silently orphan existing data. Instead this
-- creates one "legacy" Business, backfills every existing row onto it, and
-- only then makes the column required — nothing existing loses its data or
-- its owner.

-- CreateTable
CREATE TABLE "Business" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Business_pkey" PRIMARY KEY ("id")
);

-- Seed a "legacy" business to own every row that existed before multi-tenant.
INSERT INTO "Business" ("id", "name", "createdAt")
VALUES ('legacy-default-business', 'Mi Negocio', CURRENT_TIMESTAMP);

-- AlterTable: add nullable businessId columns first, backfill, then enforce NOT NULL.
ALTER TABLE "User" ADD COLUMN "businessId" TEXT;
UPDATE "User" SET "businessId" = 'legacy-default-business' WHERE "businessId" IS NULL;
ALTER TABLE "User" ALTER COLUMN "businessId" SET NOT NULL;

ALTER TABLE "Service" ADD COLUMN "businessId" TEXT;
UPDATE "Service" SET "businessId" = 'legacy-default-business' WHERE "businessId" IS NULL;
ALTER TABLE "Service" ALTER COLUMN "businessId" SET NOT NULL;

ALTER TABLE "Client" ADD COLUMN "businessId" TEXT;
UPDATE "Client" SET "businessId" = 'legacy-default-business' WHERE "businessId" IS NULL;
ALTER TABLE "Client" ALTER COLUMN "businessId" SET NOT NULL;

ALTER TABLE "Booking" ADD COLUMN "businessId" TEXT;
UPDATE "Booking" SET "businessId" = 'legacy-default-business' WHERE "businessId" IS NULL;
ALTER TABLE "Booking" ALTER COLUMN "businessId" SET NOT NULL;

ALTER TABLE "GiftCard" ADD COLUMN "businessId" TEXT;
UPDATE "GiftCard" SET "businessId" = 'legacy-default-business' WHERE "businessId" IS NULL;
ALTER TABLE "GiftCard" ALTER COLUMN "businessId" SET NOT NULL;

ALTER TABLE "CashRegisterSession" ADD COLUMN "businessId" TEXT;
UPDATE "CashRegisterSession" SET "businessId" = 'legacy-default-business' WHERE "businessId" IS NULL;
ALTER TABLE "CashRegisterSession" ALTER COLUMN "businessId" SET NOT NULL;

ALTER TABLE "Sale" ADD COLUMN "businessId" TEXT;
UPDATE "Sale" SET "businessId" = 'legacy-default-business' WHERE "businessId" IS NULL;
ALTER TABLE "Sale" ALTER COLUMN "businessId" SET NOT NULL;

ALTER TABLE "Expense" ADD COLUMN "businessId" TEXT;
UPDATE "Expense" SET "businessId" = 'legacy-default-business' WHERE "businessId" IS NULL;
ALTER TABLE "Expense" ALTER COLUMN "businessId" SET NOT NULL;

-- DropIndex (old global-uniqueness constraints, replaced by per-business ones below)
DROP INDEX "Service_name_key";
DROP INDEX "Client_email_key";
DROP INDEX "Booking_staffId_startTime_idx";
DROP INDEX "Booking_clientId_idx";
DROP INDEX "GiftCard_code_key";
DROP INDEX "Sale_cashSessionId_idx";
DROP INDEX "Sale_createdAt_idx";
DROP INDEX "Expense_date_idx";

-- CreateIndex
CREATE INDEX "User_businessId_idx" ON "User"("businessId");
CREATE UNIQUE INDEX "Service_businessId_name_key" ON "Service"("businessId", "name");
CREATE UNIQUE INDEX "Client_businessId_email_key" ON "Client"("businessId", "email");
CREATE INDEX "Booking_businessId_staffId_startTime_idx" ON "Booking"("businessId", "staffId", "startTime");
CREATE INDEX "Booking_businessId_clientId_idx" ON "Booking"("businessId", "clientId");
CREATE UNIQUE INDEX "GiftCard_businessId_code_key" ON "GiftCard"("businessId", "code");
CREATE INDEX "CashRegisterSession_businessId_idx" ON "CashRegisterSession"("businessId");
CREATE INDEX "Sale_businessId_cashSessionId_idx" ON "Sale"("businessId", "cashSessionId");
CREATE INDEX "Sale_businessId_createdAt_idx" ON "Sale"("businessId", "createdAt");
CREATE INDEX "Expense_businessId_date_idx" ON "Expense"("businessId", "date");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Service" ADD CONSTRAINT "Service_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Client" ADD CONSTRAINT "Client_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GiftCard" ADD CONSTRAINT "GiftCard_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CashRegisterSession" ADD CONSTRAINT "CashRegisterSession_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
