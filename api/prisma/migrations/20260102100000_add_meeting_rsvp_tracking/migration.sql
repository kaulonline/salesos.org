-- Add RSVP response tracking to meeting participants
-- This migration adds response status tracking for meeting invite responses

-- Create enum for RSVP response status
CREATE TYPE "MeetingRsvpStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'TENTATIVE', 'NO_RESPONSE');

-- Add response tracking columns to meeting_participants
ALTER TABLE "meeting_participants" 
ADD COLUMN "responseStatus" "MeetingRsvpStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN "responseAt" TIMESTAMP(3),
ADD COLUMN "responseNote" TEXT,
ADD COLUMN "inviteSentAt" TIMESTAMP(3),
ADD COLUMN "reminderSentAt" TIMESTAMP(3),
ADD COLUMN "cancellationSentAt" TIMESTAMP(3);

-- Create index for response status queries
CREATE INDEX "meeting_participants_responseStatus_idx" ON "meeting_participants"("responseStatus");

-- Add cancellation tracking to meeting_sessions
ALTER TABLE "meeting_sessions"
ADD COLUMN "cancelledAt" TIMESTAMP(3),
ADD COLUMN "cancelledBy" TEXT,
ADD COLUMN "cancellationReason" TEXT,
ADD COLUMN "cancellationNotificationSent" BOOLEAN DEFAULT false;

-- Create table for tracking invite response history
CREATE TABLE "meeting_invite_responses" (
    "id" TEXT NOT NULL,
    "meetingSessionId" TEXT NOT NULL,
    "participantId" TEXT,
    "email" TEXT NOT NULL,
    "responseStatus" "MeetingRsvpStatus" NOT NULL,
    "previousStatus" "MeetingRsvpStatus",
    "responseSource" TEXT, -- 'email_ics', 'zoom_api', 'teams_api', 'google_api', 'manual'
    "rawPayload" JSONB,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meeting_invite_responses_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraints
ALTER TABLE "meeting_invite_responses" 
ADD CONSTRAINT "meeting_invite_responses_meetingSessionId_fkey" 
FOREIGN KEY ("meetingSessionId") REFERENCES "meeting_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "meeting_invite_responses" 
ADD CONSTRAINT "meeting_invite_responses_participantId_fkey" 
FOREIGN KEY ("participantId") REFERENCES "meeting_participants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create indexes for efficient queries
CREATE INDEX "meeting_invite_responses_meetingSessionId_idx" ON "meeting_invite_responses"("meetingSessionId");
CREATE INDEX "meeting_invite_responses_email_idx" ON "meeting_invite_responses"("email");
CREATE INDEX "meeting_invite_responses_responseStatus_idx" ON "meeting_invite_responses"("responseStatus");
CREATE INDEX "meeting_invite_responses_processedAt_idx" ON "meeting_invite_responses"("processedAt");
