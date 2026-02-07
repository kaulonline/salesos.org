-- CreateEnum
CREATE TYPE "DraftStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'SENT', 'REJECTED', 'EXPIRED');

-- CreateTable
CREATE TABLE "EmailDraft" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "inReplyToMessageId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "bodyText" TEXT,
    "toEmails" TEXT[],
    "ccEmails" TEXT[],
    "status" "DraftStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generationPrompt" TEXT,
    "confidence" DOUBLE PRECISION,
    "tone" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "editedContent" TEXT,
    "sentAt" TIMESTAMP(3),
    "sentMessageId" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailDraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailDraft_inReplyToMessageId_key" ON "EmailDraft"("inReplyToMessageId");

-- AddForeignKey
ALTER TABLE "EmailDraft" ADD CONSTRAINT "EmailDraft_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "EmailThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailDraft" ADD CONSTRAINT "EmailDraft_inReplyToMessageId_fkey" FOREIGN KEY ("inReplyToMessageId") REFERENCES "EmailMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
