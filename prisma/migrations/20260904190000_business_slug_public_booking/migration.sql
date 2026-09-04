-- CreateTable
CREATE TABLE "PublicBookingAttempt" (
    "id" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PublicBookingAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PublicBookingAttempt_ip_createdAt_idx" ON "PublicBookingAttempt"("ip", "createdAt");

-- AlterTable: agregar "slug" nullable primero (dato-seguro contra
-- negocios ya existentes), completarlo, y recién ahí exigirlo.
ALTER TABLE "Business" ADD COLUMN "slug" TEXT;

-- Backfill: slug a partir del nombre + los primeros 6 caracteres del id
-- (garantiza unicidad sin depender de que el nombre sea único).
UPDATE "Business"
SET "slug" = lower(regexp_replace(regexp_replace(trim("name"), '[^a-zA-Z0-9]+', '-', 'g'), '(^-+|-+$)', '', 'g'))
  || '-' || substring("id", 1, 6)
WHERE "slug" IS NULL;

ALTER TABLE "Business" ALTER COLUMN "slug" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Business_slug_key" ON "Business"("slug");
