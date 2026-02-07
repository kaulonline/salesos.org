-- CreateEnum
CREATE TYPE "EmailThreadStatus" AS ENUM ('ACTIVE', 'AWAITING_RESPONSE', 'RESPONDED', 'CLOSED', 'BOUNCED', 'UNSUBSCRIBED');

-- CreateEnum
CREATE TYPE "EmailDirection" AS ENUM ('OUTBOUND', 'INBOUND');

-- CreateEnum
CREATE TYPE "EmailMessageStatus" AS ENUM ('DRAFT', 'QUEUED', 'SENT', 'DELIVERED', 'OPENED', 'CLICKED', 'BOUNCED', 'FAILED', 'RECEIVED');

-- CreateEnum
CREATE TYPE "EmailIntent" AS ENUM ('POSITIVE_REPLY', 'NEGATIVE_REPLY', 'QUESTION', 'MEETING_REQUEST', 'REFERRAL', 'OUT_OF_OFFICE', 'UNSUBSCRIBE', 'NEUTRAL', 'FOLLOW_UP');

-- CreateEnum
CREATE TYPE "EmailUrgency" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- AlterTable
ALTER TABLE "Activity" ADD COLUMN     "emailThreadId" TEXT;

-- CreateTable
CREATE TABLE "EmailThread" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "leadId" TEXT,
    "accountId" TEXT,
    "contactId" TEXT,
    "opportunityId" TEXT,
    "subject" TEXT NOT NULL,
    "status" "EmailThreadStatus" NOT NULL DEFAULT 'ACTIVE',
    "totalEmails" INTEGER NOT NULL DEFAULT 1,
    "totalResponses" INTEGER NOT NULL DEFAULT 0,
    "lastEmailAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastResponseAt" TIMESTAMP(3),
    "sentiment" "Sentiment",
    "engagementLevel" "EngagementLevel",
    "suggestedActions" TEXT[],
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailMessage" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "userId" TEXT,
    "messageId" TEXT NOT NULL,
    "inReplyTo" TEXT,
    "references" TEXT[],
    "fromEmail" TEXT NOT NULL,
    "fromName" TEXT,
    "toEmails" TEXT[],
    "ccEmails" TEXT[],
    "bccEmails" TEXT[],
    "subject" TEXT NOT NULL,
    "bodyHtml" TEXT,
    "bodyText" TEXT,
    "direction" "EmailDirection" NOT NULL,
    "status" "EmailMessageStatus" NOT NULL DEFAULT 'SENT',
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "clickedAt" TIMESTAMP(3),
    "bouncedAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3),
    "sentiment" "Sentiment",
    "intent" "EmailIntent",
    "keyPoints" TEXT[],
    "actionItemsExtracted" TEXT[],
    "urgency" "EmailUrgency",
    "requiresResponse" BOOLEAN NOT NULL DEFAULT false,
    "suggestedResponse" TEXT,
    "crmActionsPerformed" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailMessage_messageId_key" ON "EmailMessage"("messageId");

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_emailThreadId_fkey" FOREIGN KEY ("emailThreadId") REFERENCES "EmailThread"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailThread" ADD CONSTRAINT "EmailThread_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailThread" ADD CONSTRAINT "EmailThread_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailThread" ADD CONSTRAINT "EmailThread_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailThread" ADD CONSTRAINT "EmailThread_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailMessage" ADD CONSTRAINT "EmailMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "EmailThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
