-- CreateEnum
CREATE TYPE "IndexingStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETE', 'ERROR');

-- CreateTable
CREATE TABLE "IndexedDocument" (
    "id" TEXT NOT NULL,
    "uploadedFileId" TEXT,
    "filename" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL DEFAULT 'application/pdf',
    "sizeBytes" INTEGER,
    "status" "IndexingStatus" NOT NULL DEFAULT 'PENDING',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "treeStructure" JSONB,
    "summary" TEXT,
    "pageCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "indexedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IndexedDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IndexedDocument_uploadedFileId_key" ON "IndexedDocument"("uploadedFileId");

-- CreateIndex
CREATE UNIQUE INDEX "IndexedDocument_documentId_key" ON "IndexedDocument"("documentId");

-- AddForeignKey
ALTER TABLE "IndexedDocument" ADD CONSTRAINT "IndexedDocument_uploadedFileId_fkey" FOREIGN KEY ("uploadedFileId") REFERENCES "UploadedFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
