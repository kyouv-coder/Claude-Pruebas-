-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "address" TEXT,
ADD COLUMN     "coverImageData" BYTEA,
ADD COLUMN     "coverImageMimeType" TEXT,
ADD COLUMN     "description" TEXT;

-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "imageData" BYTEA,
ADD COLUMN     "imageMimeType" TEXT;

