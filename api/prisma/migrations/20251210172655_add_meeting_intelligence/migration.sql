-- CreateEnum
CREATE TYPE "MeetingPlatform" AS ENUM ('ZOOM', 'TEAMS', 'GOOGLE_MEET', 'WEBEX', 'OTHER');

-- CreateEnum
CREATE TYPE "MeetingSessionStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "RecordingStatus" AS ENUM ('NOT_STARTED', 'RECORDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "EngagementLevel" AS ENUM ('VERY_LOW', 'LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('NONE', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- AlterTable
ALTER TABLE "Activity" ADD COLUMN     "meetingSessionId" TEXT;

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "meetingSessionId" TEXT;

-- CreateTable
CREATE TABLE "meeting_sessions" (
    "id" TEXT NOT NULL,
    "platform" "MeetingPlatform" NOT NULL,
    "externalMeetingId" TEXT,
    "meetingUrl" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "scheduledStart" TIMESTAMP(3) NOT NULL,
    "scheduledEnd" TIMESTAMP(3),
    "actualStart" TIMESTAMP(3),
    "actualEnd" TIMESTAMP(3),
    "duration" INTEGER,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "status" "MeetingSessionStatus" NOT NULL DEFAULT 'SCHEDULED',
    "recordingStatus" "RecordingStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "recordingUrl" TEXT,
    "recordingDuration" INTEGER,
    "transcriptText" TEXT,
    "transcriptUrl" TEXT,
    "botJoinedAt" TIMESTAMP(3),
    "botLeftAt" TIMESTAMP(3),
    "botStatus" TEXT,
    "ownerId" TEXT NOT NULL,
    "leadId" TEXT,
    "accountId" TEXT,
    "opportunityId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meeting_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meeting_participants" (
    "id" TEXT NOT NULL,
    "meetingSessionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "role" TEXT,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "isBot" BOOLEAN NOT NULL DEFAULT false,
    "contactId" TEXT,
    "joinedAt" TIMESTAMP(3),
    "leftAt" TIMESTAMP(3),
    "duration" INTEGER,
    "speakingDuration" INTEGER,
    "speakingCount" INTEGER,
    "engagementLevel" "EngagementLevel",
    "externalParticipantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meeting_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transcript_segments" (
    "id" TEXT NOT NULL,
    "meetingSessionId" TEXT NOT NULL,
    "speakerName" TEXT NOT NULL,
    "speakerEmail" TEXT,
    "text" TEXT NOT NULL,
    "startTime" DOUBLE PRECISION NOT NULL,
    "endTime" DOUBLE PRECISION NOT NULL,
    "duration" DOUBLE PRECISION NOT NULL,
    "sentiment" TEXT,
    "confidence" DOUBLE PRECISION,
    "language" TEXT DEFAULT 'en',
    "keywords" TEXT[],
    "topics" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transcript_segments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meeting_analyses" (
    "id" TEXT NOT NULL,
    "meetingSessionId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "keyPoints" TEXT[],
    "decisions" TEXT[],
    "actionItems" JSONB[],
    "overallSentiment" TEXT,
    "sentimentScore" DOUBLE PRECISION,
    "buyingSignals" TEXT[],
    "objections" TEXT[],
    "nextSteps" TEXT[],
    "competitorMentions" TEXT[],
    "dealRiskLevel" "RiskLevel",
    "dealRiskFactors" TEXT[],
    "opportunityScore" DOUBLE PRECISION,
    "topicsDiscussed" TEXT[],
    "questionsAsked" JSONB[],
    "followUpRecommendations" JSONB[],
    "modelUsed" TEXT,
    "processingTime" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meeting_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meeting_insights" (
    "id" TEXT NOT NULL,
    "meetingSessionId" TEXT NOT NULL,
    "type" "InsightType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "sourceText" TEXT,
    "sourceTimestamp" DOUBLE PRECISION,
    "speakerName" TEXT,
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "isActioned" BOOLEAN NOT NULL DEFAULT false,
    "actionedAt" TIMESTAMP(3),
    "actionedBy" TEXT,
    "confidence" DOUBLE PRECISION,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meeting_insights_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "meeting_sessions_ownerId_idx" ON "meeting_sessions"("ownerId");

-- CreateIndex
CREATE INDEX "meeting_sessions_leadId_idx" ON "meeting_sessions"("leadId");

-- CreateIndex
CREATE INDEX "meeting_sessions_accountId_idx" ON "meeting_sessions"("accountId");

-- CreateIndex
CREATE INDEX "meeting_sessions_opportunityId_idx" ON "meeting_sessions"("opportunityId");

-- CreateIndex
CREATE INDEX "meeting_sessions_platform_idx" ON "meeting_sessions"("platform");

-- CreateIndex
CREATE INDEX "meeting_sessions_status_idx" ON "meeting_sessions"("status");

-- CreateIndex
CREATE INDEX "meeting_sessions_scheduledStart_idx" ON "meeting_sessions"("scheduledStart");

-- CreateIndex
CREATE INDEX "meeting_sessions_externalMeetingId_idx" ON "meeting_sessions"("externalMeetingId");

-- CreateIndex
CREATE INDEX "meeting_participants_meetingSessionId_idx" ON "meeting_participants"("meetingSessionId");

-- CreateIndex
CREATE INDEX "meeting_participants_contactId_idx" ON "meeting_participants"("contactId");

-- CreateIndex
CREATE INDEX "meeting_participants_email_idx" ON "meeting_participants"("email");

-- CreateIndex
CREATE INDEX "transcript_segments_meetingSessionId_idx" ON "transcript_segments"("meetingSessionId");

-- CreateIndex
CREATE INDEX "transcript_segments_startTime_idx" ON "transcript_segments"("startTime");

-- CreateIndex
CREATE INDEX "transcript_segments_speakerName_idx" ON "transcript_segments"("speakerName");

-- CreateIndex
CREATE UNIQUE INDEX "meeting_analyses_meetingSessionId_key" ON "meeting_analyses"("meetingSessionId");

-- CreateIndex
CREATE INDEX "meeting_insights_meetingSessionId_idx" ON "meeting_insights"("meetingSessionId");

-- CreateIndex
CREATE INDEX "meeting_insights_type_idx" ON "meeting_insights"("type");

-- CreateIndex
CREATE INDEX "meeting_insights_priority_idx" ON "meeting_insights"("priority");

-- CreateIndex
CREATE INDEX "meeting_insights_isActioned_idx" ON "meeting_insights"("isActioned");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_meetingSessionId_fkey" FOREIGN KEY ("meetingSessionId") REFERENCES "meeting_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_meetingSessionId_fkey" FOREIGN KEY ("meetingSessionId") REFERENCES "meeting_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting_sessions" ADD CONSTRAINT "meeting_sessions_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting_sessions" ADD CONSTRAINT "meeting_sessions_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting_sessions" ADD CONSTRAINT "meeting_sessions_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting_sessions" ADD CONSTRAINT "meeting_sessions_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting_participants" ADD CONSTRAINT "meeting_participants_meetingSessionId_fkey" FOREIGN KEY ("meetingSessionId") REFERENCES "meeting_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting_participants" ADD CONSTRAINT "meeting_participants_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transcript_segments" ADD CONSTRAINT "transcript_segments_meetingSessionId_fkey" FOREIGN KEY ("meetingSessionId") REFERENCES "meeting_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting_analyses" ADD CONSTRAINT "meeting_analyses_meetingSessionId_fkey" FOREIGN KEY ("meetingSessionId") REFERENCES "meeting_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting_insights" ADD CONSTRAINT "meeting_insights_meetingSessionId_fkey" FOREIGN KEY ("meetingSessionId") REFERENCES "meeting_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
