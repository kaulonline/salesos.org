/*
  Warnings:

  - You are about to drop the column `email` on the `meeting_invite_responses` table. All the data in the column will be lost.
  - You are about to drop the column `participantId` on the `meeting_invite_responses` table. All the data in the column will be lost.
  - You are about to drop the column `processedAt` on the `meeting_invite_responses` table. All the data in the column will be lost.
  - You are about to drop the column `rawPayload` on the `meeting_invite_responses` table. All the data in the column will be lost.
  - You are about to drop the column `responseStatus` on the `meeting_invite_responses` table. All the data in the column will be lost.
  - Added the required column `newStatus` to the `meeting_invite_responses` table without a default value. This is not possible if the table is not empty.
  - Added the required column `participantEmail` to the `meeting_invite_responses` table without a default value. This is not possible if the table is not empty.
  - Made the column `cancellationNotificationSent` on table `meeting_sessions` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "EmailTemplateCategory" AS ENUM ('NOTIFICATION', 'TRANSACTIONAL', 'MARKETING', 'SALES', 'FOLLOW_UP', 'MEETING', 'DIGEST', 'CUSTOM');

-- CreateEnum
CREATE TYPE "EmailTemplateStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "EmailCampaignStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'SENDING', 'COMPLETED', 'PAUSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EmailQueueStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PreGeneratedKeyStatus" AS ENUM ('AVAILABLE', 'CLAIMED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "DeviceType" AS ENUM ('MOBILE_IOS', 'MOBILE_ANDROID', 'TABLET_IPAD', 'TABLET_ANDROID', 'DESKTOP_WEB', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "PushTokenType" AS ENUM ('APNS', 'FCM');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('ACTIVE', 'ENDED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "NotificationPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('DEAL_UPDATE', 'TASK_REMINDER', 'AI_INSIGHT', 'SYSTEM_ALERT', 'ADMIN_BROADCAST', 'CUSTOM');

-- CreateEnum
CREATE TYPE "AppContentType" AS ENUM ('TERMS_OF_SERVICE', 'PRIVACY_SECURITY', 'SECURITY', 'DATA_PROCESSING_AGREEMENT', 'OSS_LICENSES', 'FEATURES', 'INTEGRATIONS', 'PRICING', 'API_DOCS', 'ABOUT_IRIS', 'BLOG', 'CAREERS', 'CONTACT', 'HELP_SUPPORT');

-- CreateEnum
CREATE TYPE "TicketCategory" AS ENUM ('BUG_REPORT', 'FEATURE_REQUEST', 'ACCOUNT_ISSUE', 'BILLING', 'INTEGRATION', 'PERFORMANCE', 'SECURITY', 'OTHER');

-- CreateEnum
CREATE TYPE "TicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'WAITING_ON_CUSTOMER', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "SupportAgentActionStatus" AS ENUM ('EXECUTED', 'FAILED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "SupportAgentPendingStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "WaitlistStatus" AS ENUM ('PENDING', 'CONTACTED', 'INVITED', 'CONVERTED', 'DECLINED');

-- CreateEnum
CREATE TYPE "AIAgentSpecialization" AS ENUM ('GENERAL', 'TECHNICAL', 'BILLING', 'ONBOARDING', 'ESCALATION', 'SALES', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "AIAgentStatus" AS ENUM ('ACTIVE', 'PAUSED', 'TRAINING', 'DISABLED');

-- DropForeignKey
ALTER TABLE "meeting_invite_responses" DROP CONSTRAINT "meeting_invite_responses_participantId_fkey";

-- DropIndex
DROP INDEX "meeting_invite_responses_email_idx";

-- DropIndex
DROP INDEX "meeting_invite_responses_processedAt_idx";

-- DropIndex
DROP INDEX "meeting_invite_responses_responseStatus_idx";

-- DropIndex
DROP INDEX "meeting_participants_responseStatus_idx";

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "lastContactedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "reminderSent" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "application_logs" ADD COLUMN     "appVersion" TEXT,
ADD COLUMN     "buildNumber" TEXT,
ADD COLUMN     "clientSource" TEXT,
ADD COLUMN     "deviceId" TEXT,
ADD COLUMN     "deviceModel" TEXT,
ADD COLUMN     "isFatal" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "osVersion" TEXT,
ADD COLUMN     "platform" TEXT,
ADD COLUMN     "screenName" TEXT;

-- AlterTable
ALTER TABLE "meeting_invite_responses" DROP COLUMN "email",
DROP COLUMN "participantId",
DROP COLUMN "processedAt",
DROP COLUMN "rawPayload",
DROP COLUMN "responseStatus",
ADD COLUMN     "newStatus" "MeetingRsvpStatus" NOT NULL,
ADD COLUMN     "participantEmail" TEXT NOT NULL,
ADD COLUMN     "participantName" TEXT,
ADD COLUMN     "rawResponse" JSONB,
ADD COLUMN     "responseNote" TEXT;

-- AlterTable
ALTER TABLE "meeting_sessions" ADD COLUMN     "salesforceEventId" TEXT,
ALTER COLUMN "cancellationNotificationSent" SET NOT NULL;

-- CreateTable
CREATE TABLE "email_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "subject" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "bodyText" TEXT,
    "preheader" TEXT,
    "category" "EmailTemplateCategory" NOT NULL DEFAULT 'CUSTOM',
    "status" "EmailTemplateStatus" NOT NULL DEFAULT 'DRAFT',
    "variables" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "useIrisBranding" BOOLEAN NOT NULL DEFAULT true,
    "ctaText" TEXT,
    "ctaUrl" TEXT,
    "targetRoles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sendCount" INTEGER NOT NULL DEFAULT 0,
    "openCount" INTEGER NOT NULL DEFAULT 0,
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT,
    "lastEditedBy" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_campaigns" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "templateId" TEXT NOT NULL,
    "recipientType" TEXT NOT NULL DEFAULT 'all',
    "targetRoles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "recipientList" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "EmailCampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduledFor" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "totalRecipients" INTEGER NOT NULL DEFAULT 0,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "openCount" INTEGER NOT NULL DEFAULT 0,
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "bounceCount" INTEGER NOT NULL DEFAULT 0,
    "unsubscribeCount" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_queue" (
    "id" TEXT NOT NULL,
    "templateId" TEXT,
    "campaignId" TEXT,
    "toEmail" TEXT NOT NULL,
    "toName" TEXT,
    "fromEmail" TEXT,
    "fromName" TEXT,
    "replyTo" TEXT,
    "subject" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "bodyText" TEXT,
    "ccEmails" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "bccEmails" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "EmailQueueStatus" NOT NULL DEFAULT 'PENDING',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "scheduledFor" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "lastAttemptAt" TIMESTAMP(3),
    "nextRetryAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "clickedAt" TIMESTAMP(3),
    "bouncedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "errorCode" TEXT,
    "userId" TEXT,
    "leadId" TEXT,
    "contactId" TEXT,
    "accountId" TEXT,
    "opportunityId" TEXT,
    "source" TEXT NOT NULL DEFAULT 'system',
    "triggeredBy" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_queue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_notification_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emailsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "dailyDigest" BOOLEAN NOT NULL DEFAULT true,
    "weeklyReport" BOOLEAN NOT NULL DEFAULT true,
    "monthlyReport" BOOLEAN NOT NULL DEFAULT false,
    "newLeadAssigned" BOOLEAN NOT NULL DEFAULT true,
    "leadStatusChange" BOOLEAN NOT NULL DEFAULT true,
    "dealStageChange" BOOLEAN NOT NULL DEFAULT true,
    "dealWonLost" BOOLEAN NOT NULL DEFAULT true,
    "taskAssigned" BOOLEAN NOT NULL DEFAULT true,
    "taskDueReminder" BOOLEAN NOT NULL DEFAULT true,
    "meetingReminder" BOOLEAN NOT NULL DEFAULT true,
    "aiInsights" BOOLEAN NOT NULL DEFAULT true,
    "systemAlerts" BOOLEAN NOT NULL DEFAULT true,
    "securityAlerts" BOOLEAN NOT NULL DEFAULT true,
    "marketingEmails" BOOLEAN NOT NULL DEFAULT false,
    "productUpdates" BOOLEAN NOT NULL DEFAULT true,
    "digestTime" TEXT DEFAULT '08:00',
    "digestTimezone" TEXT DEFAULT 'UTC',
    "digestDays" TEXT[] DEFAULT ARRAY['MON', 'TUE', 'WED', 'THU', 'FRI']::TEXT[],
    "unsubscribedAt" TIMESTAMP(3),
    "unsubscribeToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pre_generated_license_keys" (
    "id" TEXT NOT NULL,
    "licenseKey" TEXT NOT NULL,
    "licenseTypeId" TEXT NOT NULL,
    "status" "PreGeneratedKeyStatus" NOT NULL DEFAULT 'AVAILABLE',
    "durationDays" INTEGER NOT NULL DEFAULT 365,
    "isTrial" BOOLEAN NOT NULL DEFAULT false,
    "claimedByUserId" TEXT,
    "claimedAt" TIMESTAMP(3),
    "userLicenseId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "generatedBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pre_generated_license_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salesforce_package_installations" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "orgName" TEXT NOT NULL,
    "instanceUrl" TEXT NOT NULL,
    "adminEmail" TEXT NOT NULL,
    "packageApiKey" TEXT NOT NULL,
    "packageSecret" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "installDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "features" JSONB NOT NULL DEFAULT '[]',
    "apiCallsToday" INTEGER NOT NULL DEFAULT 0,
    "apiCallLimit" INTEGER NOT NULL DEFAULT 10000,
    "lastResetDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "salesforceVersion" TEXT,
    "packageVersion" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "salesforce_package_installations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salesforce_package_users" (
    "id" TEXT NOT NULL,
    "salesforceUserId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "installationId" TEXT NOT NULL,
    "irisUserId" TEXT,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "tokenExpiresAt" TIMESTAMP(3) NOT NULL,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "conversationCount" INTEGER NOT NULL DEFAULT 0,
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "preferences" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "salesforce_package_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_devices" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceType" "DeviceType" NOT NULL,
    "deviceId" TEXT NOT NULL,
    "deviceName" TEXT,
    "deviceModel" TEXT,
    "osVersion" TEXT,
    "appVersion" TEXT,
    "pushToken" TEXT,
    "pushTokenType" "PushTokenType",
    "pushTokenUpdatedAt" TIMESTAMP(3),
    "pushEnabled" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT,
    "sessionToken" TEXT NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "durationSeconds" INTEGER,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "apiCallCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_feature_usage" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "featureKey" TEXT NOT NULL,
    "usageCount" INTEGER NOT NULL DEFAULT 1,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "device_feature_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "titleTemplate" TEXT NOT NULL,
    "bodyTemplate" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'CUSTOM',
    "priority" "NotificationPriority" NOT NULL DEFAULT 'NORMAL',
    "channel" TEXT NOT NULL,
    "targetRoles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "targetLicenseTiers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "priority" "NotificationPriority" NOT NULL DEFAULT 'NORMAL',
    "templateId" TEXT,
    "action" TEXT,
    "actionData" JSONB,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "scheduledFor" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdBy" TEXT,
    "source" TEXT NOT NULL DEFAULT 'system',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "push_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_content" (
    "id" TEXT NOT NULL,
    "type" "AppContentType" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUpdatedBy" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_visibility_rules" (
    "id" TEXT NOT NULL,
    "featureKey" TEXT NOT NULL,
    "showOnMobile" BOOLEAN NOT NULL DEFAULT true,
    "showOnTablet" BOOLEAN NOT NULL DEFAULT true,
    "showOnDesktop" BOOLEAN NOT NULL DEFAULT true,
    "minLicenseTier" TEXT,
    "uiPosition" INTEGER,
    "showWhenDisabled" BOOLEAN NOT NULL DEFAULT false,
    "upgradeMessage" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feature_visibility_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'general',
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_tickets" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "userId" TEXT,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "TicketCategory" NOT NULL,
    "priority" "TicketPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "aiDraftResponse" TEXT,
    "assignedToId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolution" TEXT,
    "aiAgentId" TEXT,
    "queueId" TEXT,
    "csatRating" INTEGER,
    "csatFeedback" TEXT,
    "csatSubmittedAt" TIMESTAMP(3),
    "feedbackToken" TEXT,
    "feedbackSentAt" TIMESTAMP(3),
    "firstResponseDue" TIMESTAMP(3),
    "firstRespondedAt" TIMESTAMP(3),
    "resolutionDue" TIMESTAMP(3),
    "slaBreached" BOOLEAN NOT NULL DEFAULT false,
    "slaBreachType" TEXT,
    "escalationLevel" INTEGER NOT NULL DEFAULT 0,
    "lastCustomerUpdateAt" TIMESTAMP(3),
    "customerUpdateCount" INTEGER NOT NULL DEFAULT 0,
    "lastInternalAlertAt" TIMESTAMP(3),
    "internalAlertCount" INTEGER NOT NULL DEFAULT 0,
    "deviceInfo" TEXT,
    "attachments" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_responses" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isAiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "responderId" TEXT,
    "aiAgentId" TEXT,
    "emailMessageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_verifications" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "formData" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_agent_actions" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "toolName" TEXT NOT NULL,
    "input" JSONB NOT NULL,
    "result" JSONB,
    "status" "SupportAgentActionStatus" NOT NULL DEFAULT 'EXECUTED',
    "duration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_agent_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_agent_pending_actions" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "toolName" TEXT NOT NULL,
    "input" JSONB NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "SupportAgentPendingStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_agent_pending_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "waitlist_subscribers" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "company" TEXT,
    "name" TEXT,
    "source" TEXT DEFAULT 'landing',
    "status" "WaitlistStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "metadata" JSONB,
    "invitedAt" TIMESTAMP(3),
    "convertedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "waitlist_subscribers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_ai_agents" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "avatar" TEXT,
    "specialization" "AIAgentSpecialization" NOT NULL,
    "systemPrompt" TEXT,
    "capabilities" JSONB,
    "model" TEXT NOT NULL DEFAULT 'claude-sonnet-4-20250514',
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.3,
    "autoReply" BOOLEAN NOT NULL DEFAULT true,
    "escalateAfter" INTEGER,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "responseDelay" INTEGER NOT NULL DEFAULT 0,
    "workingHoursStart" TEXT,
    "workingHoursEnd" TEXT,
    "workingDays" JSONB,
    "timezone" TEXT,
    "status" "AIAgentStatus" NOT NULL DEFAULT 'ACTIVE',
    "isOnline" BOOLEAN NOT NULL DEFAULT true,
    "lastActiveAt" TIMESTAMP(3),
    "totalTicketsHandled" INTEGER NOT NULL DEFAULT 0,
    "avgResolutionTime" INTEGER,
    "csatAverage" DOUBLE PRECISION,
    "escalationRate" DOUBLE PRECISION,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_ai_agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_queues" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "categories" JSONB,
    "priorities" JSONB,
    "keywords" JSONB,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "maxCapacity" INTEGER,
    "slaMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "currentTickets" INTEGER NOT NULL DEFAULT 0,
    "avgWaitTime" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_queues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_queue_agents" (
    "id" TEXT NOT NULL,
    "queueId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "support_queue_agents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "email_templates_name_key" ON "email_templates"("name");

-- CreateIndex
CREATE UNIQUE INDEX "email_templates_slug_key" ON "email_templates"("slug");

-- CreateIndex
CREATE INDEX "email_templates_category_idx" ON "email_templates"("category");

-- CreateIndex
CREATE INDEX "email_templates_status_idx" ON "email_templates"("status");

-- CreateIndex
CREATE INDEX "email_templates_slug_idx" ON "email_templates"("slug");

-- CreateIndex
CREATE INDEX "email_campaigns_status_idx" ON "email_campaigns"("status");

-- CreateIndex
CREATE INDEX "email_campaigns_scheduledFor_idx" ON "email_campaigns"("scheduledFor");

-- CreateIndex
CREATE INDEX "email_campaigns_templateId_idx" ON "email_campaigns"("templateId");

-- CreateIndex
CREATE INDEX "email_queue_status_idx" ON "email_queue"("status");

-- CreateIndex
CREATE INDEX "email_queue_priority_idx" ON "email_queue"("priority");

-- CreateIndex
CREATE INDEX "email_queue_scheduledFor_idx" ON "email_queue"("scheduledFor");

-- CreateIndex
CREATE INDEX "email_queue_toEmail_idx" ON "email_queue"("toEmail");

-- CreateIndex
CREATE INDEX "email_queue_source_idx" ON "email_queue"("source");

-- CreateIndex
CREATE INDEX "email_queue_campaignId_idx" ON "email_queue"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "email_notification_preferences_userId_key" ON "email_notification_preferences"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "email_notification_preferences_unsubscribeToken_key" ON "email_notification_preferences"("unsubscribeToken");

-- CreateIndex
CREATE INDEX "email_notification_preferences_userId_idx" ON "email_notification_preferences"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "pre_generated_license_keys_licenseKey_key" ON "pre_generated_license_keys"("licenseKey");

-- CreateIndex
CREATE INDEX "pre_generated_license_keys_status_idx" ON "pre_generated_license_keys"("status");

-- CreateIndex
CREATE INDEX "pre_generated_license_keys_licenseTypeId_idx" ON "pre_generated_license_keys"("licenseTypeId");

-- CreateIndex
CREATE INDEX "pre_generated_license_keys_licenseKey_idx" ON "pre_generated_license_keys"("licenseKey");

-- CreateIndex
CREATE UNIQUE INDEX "salesforce_package_installations_orgId_key" ON "salesforce_package_installations"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "salesforce_package_installations_packageApiKey_key" ON "salesforce_package_installations"("packageApiKey");

-- CreateIndex
CREATE INDEX "salesforce_package_installations_orgId_idx" ON "salesforce_package_installations"("orgId");

-- CreateIndex
CREATE INDEX "salesforce_package_installations_packageApiKey_idx" ON "salesforce_package_installations"("packageApiKey");

-- CreateIndex
CREATE INDEX "salesforce_package_users_salesforceUserId_idx" ON "salesforce_package_users"("salesforceUserId");

-- CreateIndex
CREATE INDEX "salesforce_package_users_installationId_idx" ON "salesforce_package_users"("installationId");

-- CreateIndex
CREATE UNIQUE INDEX "salesforce_package_users_installationId_salesforceUserId_key" ON "salesforce_package_users"("installationId", "salesforceUserId");

-- CreateIndex
CREATE INDEX "user_devices_userId_idx" ON "user_devices"("userId");

-- CreateIndex
CREATE INDEX "user_devices_deviceType_idx" ON "user_devices"("deviceType");

-- CreateIndex
CREATE INDEX "user_devices_lastSeenAt_idx" ON "user_devices"("lastSeenAt");

-- CreateIndex
CREATE INDEX "user_devices_pushToken_idx" ON "user_devices"("pushToken");

-- CreateIndex
CREATE UNIQUE INDEX "user_devices_userId_deviceId_key" ON "user_devices"("userId", "deviceId");

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_sessionToken_key" ON "user_sessions"("sessionToken");

-- CreateIndex
CREATE INDEX "user_sessions_userId_idx" ON "user_sessions"("userId");

-- CreateIndex
CREATE INDEX "user_sessions_deviceId_idx" ON "user_sessions"("deviceId");

-- CreateIndex
CREATE INDEX "user_sessions_status_idx" ON "user_sessions"("status");

-- CreateIndex
CREATE INDEX "user_sessions_startedAt_idx" ON "user_sessions"("startedAt");

-- CreateIndex
CREATE INDEX "device_feature_usage_deviceId_idx" ON "device_feature_usage"("deviceId");

-- CreateIndex
CREATE INDEX "device_feature_usage_userId_idx" ON "device_feature_usage"("userId");

-- CreateIndex
CREATE INDEX "device_feature_usage_featureKey_idx" ON "device_feature_usage"("featureKey");

-- CreateIndex
CREATE INDEX "device_feature_usage_date_idx" ON "device_feature_usage"("date");

-- CreateIndex
CREATE UNIQUE INDEX "device_feature_usage_deviceId_featureKey_date_key" ON "device_feature_usage"("deviceId", "featureKey", "date");

-- CreateIndex
CREATE UNIQUE INDEX "notification_templates_name_key" ON "notification_templates"("name");

-- CreateIndex
CREATE UNIQUE INDEX "notification_templates_slug_key" ON "notification_templates"("slug");

-- CreateIndex
CREATE INDEX "notification_templates_type_idx" ON "notification_templates"("type");

-- CreateIndex
CREATE INDEX "notification_templates_isActive_idx" ON "notification_templates"("isActive");

-- CreateIndex
CREATE INDEX "push_notifications_userId_idx" ON "push_notifications"("userId");

-- CreateIndex
CREATE INDEX "push_notifications_status_idx" ON "push_notifications"("status");

-- CreateIndex
CREATE INDEX "push_notifications_type_idx" ON "push_notifications"("type");

-- CreateIndex
CREATE INDEX "push_notifications_scheduledFor_idx" ON "push_notifications"("scheduledFor");

-- CreateIndex
CREATE INDEX "push_notifications_createdAt_idx" ON "push_notifications"("createdAt");

-- CreateIndex
CREATE INDEX "app_content_type_idx" ON "app_content"("type");

-- CreateIndex
CREATE INDEX "app_content_isActive_idx" ON "app_content"("isActive");

-- CreateIndex
CREATE INDEX "app_content_type_isActive_idx" ON "app_content"("type", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "app_content_type_version_key" ON "app_content"("type", "version");

-- CreateIndex
CREATE UNIQUE INDEX "feature_visibility_rules_featureKey_key" ON "feature_visibility_rules"("featureKey");

-- CreateIndex
CREATE INDEX "feature_visibility_rules_featureKey_idx" ON "feature_visibility_rules"("featureKey");

-- CreateIndex
CREATE INDEX "feature_visibility_rules_minLicenseTier_idx" ON "feature_visibility_rules"("minLicenseTier");

-- CreateIndex
CREATE UNIQUE INDEX "system_settings_key_key" ON "system_settings"("key");

-- CreateIndex
CREATE INDEX "system_settings_category_idx" ON "system_settings"("category");

-- CreateIndex
CREATE UNIQUE INDEX "support_tickets_caseId_key" ON "support_tickets"("caseId");

-- CreateIndex
CREATE UNIQUE INDEX "support_tickets_feedbackToken_key" ON "support_tickets"("feedbackToken");

-- CreateIndex
CREATE INDEX "support_tickets_email_idx" ON "support_tickets"("email");

-- CreateIndex
CREATE INDEX "support_tickets_status_idx" ON "support_tickets"("status");

-- CreateIndex
CREATE INDEX "support_tickets_category_idx" ON "support_tickets"("category");

-- CreateIndex
CREATE INDEX "support_tickets_priority_idx" ON "support_tickets"("priority");

-- CreateIndex
CREATE INDEX "support_tickets_caseId_idx" ON "support_tickets"("caseId");

-- CreateIndex
CREATE INDEX "support_tickets_userId_idx" ON "support_tickets"("userId");

-- CreateIndex
CREATE INDEX "support_tickets_assignedToId_idx" ON "support_tickets"("assignedToId");

-- CreateIndex
CREATE INDEX "support_tickets_aiAgentId_idx" ON "support_tickets"("aiAgentId");

-- CreateIndex
CREATE INDEX "support_tickets_queueId_idx" ON "support_tickets"("queueId");

-- CreateIndex
CREATE INDEX "support_tickets_createdAt_idx" ON "support_tickets"("createdAt");

-- CreateIndex
CREATE INDEX "support_tickets_feedbackToken_idx" ON "support_tickets"("feedbackToken");

-- CreateIndex
CREATE INDEX "support_tickets_firstResponseDue_idx" ON "support_tickets"("firstResponseDue");

-- CreateIndex
CREATE INDEX "support_tickets_resolutionDue_idx" ON "support_tickets"("resolutionDue");

-- CreateIndex
CREATE INDEX "support_tickets_slaBreached_idx" ON "support_tickets"("slaBreached");

-- CreateIndex
CREATE INDEX "support_tickets_escalationLevel_idx" ON "support_tickets"("escalationLevel");

-- CreateIndex
CREATE INDEX "ticket_responses_ticketId_idx" ON "ticket_responses"("ticketId");

-- CreateIndex
CREATE INDEX "ticket_responses_responderId_idx" ON "ticket_responses"("responderId");

-- CreateIndex
CREATE INDEX "ticket_responses_aiAgentId_idx" ON "ticket_responses"("aiAgentId");

-- CreateIndex
CREATE INDEX "ticket_responses_createdAt_idx" ON "ticket_responses"("createdAt");

-- CreateIndex
CREATE INDEX "ticket_responses_emailMessageId_idx" ON "ticket_responses"("emailMessageId");

-- CreateIndex
CREATE UNIQUE INDEX "ticket_verifications_token_key" ON "ticket_verifications"("token");

-- CreateIndex
CREATE INDEX "ticket_verifications_token_idx" ON "ticket_verifications"("token");

-- CreateIndex
CREATE INDEX "ticket_verifications_email_idx" ON "ticket_verifications"("email");

-- CreateIndex
CREATE INDEX "ticket_verifications_expiresAt_idx" ON "ticket_verifications"("expiresAt");

-- CreateIndex
CREATE INDEX "support_agent_actions_ticketId_idx" ON "support_agent_actions"("ticketId");

-- CreateIndex
CREATE INDEX "support_agent_actions_toolName_idx" ON "support_agent_actions"("toolName");

-- CreateIndex
CREATE INDEX "support_agent_actions_createdAt_idx" ON "support_agent_actions"("createdAt");

-- CreateIndex
CREATE INDEX "support_agent_pending_actions_ticketId_idx" ON "support_agent_pending_actions"("ticketId");

-- CreateIndex
CREATE INDEX "support_agent_pending_actions_status_idx" ON "support_agent_pending_actions"("status");

-- CreateIndex
CREATE INDEX "support_agent_pending_actions_createdAt_idx" ON "support_agent_pending_actions"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "waitlist_subscribers_email_key" ON "waitlist_subscribers"("email");

-- CreateIndex
CREATE INDEX "waitlist_subscribers_email_idx" ON "waitlist_subscribers"("email");

-- CreateIndex
CREATE INDEX "waitlist_subscribers_status_idx" ON "waitlist_subscribers"("status");

-- CreateIndex
CREATE INDEX "waitlist_subscribers_createdAt_idx" ON "waitlist_subscribers"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "support_ai_agents_slug_key" ON "support_ai_agents"("slug");

-- CreateIndex
CREATE INDEX "support_ai_agents_status_idx" ON "support_ai_agents"("status");

-- CreateIndex
CREATE INDEX "support_ai_agents_specialization_idx" ON "support_ai_agents"("specialization");

-- CreateIndex
CREATE INDEX "support_ai_agents_isOnline_idx" ON "support_ai_agents"("isOnline");

-- CreateIndex
CREATE UNIQUE INDEX "support_queues_slug_key" ON "support_queues"("slug");

-- CreateIndex
CREATE INDEX "support_queues_isActive_idx" ON "support_queues"("isActive");

-- CreateIndex
CREATE INDEX "support_queues_isDefault_idx" ON "support_queues"("isDefault");

-- CreateIndex
CREATE INDEX "support_queue_agents_queueId_idx" ON "support_queue_agents"("queueId");

-- CreateIndex
CREATE INDEX "support_queue_agents_agentId_idx" ON "support_queue_agents"("agentId");

-- CreateIndex
CREATE UNIQUE INDEX "support_queue_agents_queueId_agentId_key" ON "support_queue_agents"("queueId", "agentId");

-- CreateIndex
CREATE INDEX "application_logs_clientSource_idx" ON "application_logs"("clientSource");

-- CreateIndex
CREATE INDEX "application_logs_screenName_idx" ON "application_logs"("screenName");

-- CreateIndex
CREATE INDEX "application_logs_platform_idx" ON "application_logs"("platform");

-- CreateIndex
CREATE INDEX "application_logs_appVersion_idx" ON "application_logs"("appVersion");

-- CreateIndex
CREATE INDEX "application_logs_isFatal_idx" ON "application_logs"("isFatal");

-- CreateIndex
CREATE INDEX "meeting_invite_responses_participantEmail_idx" ON "meeting_invite_responses"("participantEmail");

-- CreateIndex
CREATE INDEX "meeting_invite_responses_createdAt_idx" ON "meeting_invite_responses"("createdAt");

-- AddForeignKey
ALTER TABLE "email_campaigns" ADD CONSTRAINT "email_campaigns_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "email_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_queue" ADD CONSTRAINT "email_queue_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "email_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_queue" ADD CONSTRAINT "email_queue_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "email_campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pre_generated_license_keys" ADD CONSTRAINT "pre_generated_license_keys_licenseTypeId_fkey" FOREIGN KEY ("licenseTypeId") REFERENCES "license_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pre_generated_license_keys" ADD CONSTRAINT "pre_generated_license_keys_claimedByUserId_fkey" FOREIGN KEY ("claimedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salesforce_package_users" ADD CONSTRAINT "salesforce_package_users_installationId_fkey" FOREIGN KEY ("installationId") REFERENCES "salesforce_package_installations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salesforce_package_users" ADD CONSTRAINT "salesforce_package_users_irisUserId_fkey" FOREIGN KEY ("irisUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_devices" ADD CONSTRAINT "user_devices_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "user_devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_feature_usage" ADD CONSTRAINT "device_feature_usage_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "user_devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_notifications" ADD CONSTRAINT "push_notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_notifications" ADD CONSTRAINT "push_notifications_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "notification_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_aiAgentId_fkey" FOREIGN KEY ("aiAgentId") REFERENCES "support_ai_agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_queueId_fkey" FOREIGN KEY ("queueId") REFERENCES "support_queues"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_responses" ADD CONSTRAINT "ticket_responses_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_responses" ADD CONSTRAINT "ticket_responses_responderId_fkey" FOREIGN KEY ("responderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_responses" ADD CONSTRAINT "ticket_responses_aiAgentId_fkey" FOREIGN KEY ("aiAgentId") REFERENCES "support_ai_agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_agent_actions" ADD CONSTRAINT "support_agent_actions_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_agent_pending_actions" ADD CONSTRAINT "support_agent_pending_actions_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_agent_pending_actions" ADD CONSTRAINT "support_agent_pending_actions_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_queue_agents" ADD CONSTRAINT "support_queue_agents_queueId_fkey" FOREIGN KEY ("queueId") REFERENCES "support_queues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_queue_agents" ADD CONSTRAINT "support_queue_agents_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "support_ai_agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
