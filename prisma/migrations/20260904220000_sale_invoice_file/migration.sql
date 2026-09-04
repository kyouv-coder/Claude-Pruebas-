-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "invoiceFileData" BYTEA,
ADD COLUMN     "invoiceFileName" TEXT,
ADD COLUMN     "invoiceMimeType" TEXT,
ADD COLUMN     "invoiceUploadedAt" TIMESTAMP(3);

