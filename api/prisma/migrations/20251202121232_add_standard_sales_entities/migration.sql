/*
  Warnings:

  - You are about to drop the column `companyId` on the `Activity` table. All the data in the column will be lost.
  - You are about to drop the column `completedAt` on the `Activity` table. All the data in the column will be lost.
  - You are about to drop the column `dealId` on the `Activity` table. All the data in the column will be lost.
  - You are about to drop the column `scheduledAt` on the `Activity` table. All the data in the column will be lost.
  - You are about to drop the column `companyId` on the `Contact` table. All the data in the column will be lost.
  - You are about to drop the column `timezone` on the `Contact` table. All the data in the column will be lost.
  - You are about to drop the `Company` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CompanyInsight` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ContactInsight` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Deal` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DealContact` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DealInsight` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `ownerId` to the `Contact` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('WEB', 'PHONE_INQUIRY', 'PARTNER_REFERRAL', 'PURCHASED_LIST', 'EXTERNAL_REFERRAL', 'EMPLOYEE_REFERRAL', 'TRADE_SHOW', 'WEB_FORM', 'SOCIAL_MEDIA', 'EMAIL_CAMPAIGN', 'WEBINAR', 'COLD_CALL', 'OTHER');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'UNQUALIFIED', 'NURTURING', 'CONVERTED', 'LOST');

-- CreateEnum
CREATE TYPE "LeadRating" AS ENUM ('HOT', 'WARM', 'COLD');

-- CreateEnum
CREATE TYPE "BuyingIntent" AS ENUM ('HIGH', 'MEDIUM', 'LOW', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('PROSPECT', 'CUSTOMER', 'PARTNER', 'RESELLER', 'COMPETITOR', 'OTHER');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'PENDING', 'CHURNED');

-- CreateEnum
CREATE TYPE "AccountRating" AS ENUM ('HOT', 'WARM', 'COLD');

-- CreateEnum
CREATE TYPE "ChurnRisk" AS ENUM ('HIGH', 'MEDIUM', 'LOW', 'NONE');

-- CreateEnum
CREATE TYPE "InfluenceLevel" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "ContactStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'BOUNCED', 'UNSUBSCRIBED');

-- CreateEnum
CREATE TYPE "OpportunitySource" AS ENUM ('EXISTING_CUSTOMER', 'NEW_CUSTOMER', 'PARTNER', 'EMPLOYEE_REFERRAL', 'EXTERNAL_REFERRAL', 'ADVERTISEMENT', 'TRADE_SHOW', 'WEB', 'WORD_OF_MOUTH', 'OTHER');

-- CreateEnum
CREATE TYPE "OpportunityType" AS ENUM ('NEW_BUSINESS', 'EXISTING_BUSINESS', 'UPSELL', 'CROSS_SELL', 'RENEWAL');

-- CreateEnum
CREATE TYPE "OpportunityStage" AS ENUM ('PROSPECTING', 'QUALIFICATION', 'NEEDS_ANALYSIS', 'VALUE_PROPOSITION', 'DECISION_MAKERS_IDENTIFIED', 'PERCEPTION_ANALYSIS', 'PROPOSAL_PRICE_QUOTE', 'NEGOTIATION_REVIEW', 'CLOSED_WON', 'CLOSED_LOST');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'WAITING', 'DEFERRED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED', 'ACTIVATED', 'EXPIRED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('PLANNED', 'ACTIVE', 'COMPLETED', 'ABORTED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ActivityType" ADD VALUE 'PRESENTATION';
ALTER TYPE "ActivityType" ADD VALUE 'SITE_VISIT';
ALTER TYPE "ActivityType" ADD VALUE 'WEBINAR';
ALTER TYPE "ActivityType" ADD VALUE 'OTHER';

-- AlterEnum
ALTER TYPE "ContactRole" ADD VALUE 'TECHNICAL_BUYER';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "InsightType" ADD VALUE 'FEATURE_REQUEST';
ALTER TYPE "InsightType" ADD VALUE 'PRICING_CONCERN';
ALTER TYPE "InsightType" ADD VALUE 'TECHNICAL_REQUIREMENT';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SeniorityLevel" ADD VALUE 'SENIOR_MANAGER';
ALTER TYPE "SeniorityLevel" ADD VALUE 'SENIOR_DIRECTOR';
ALTER TYPE "SeniorityLevel" ADD VALUE 'SVP';
ALTER TYPE "SeniorityLevel" ADD VALUE 'OWNER';

-- DropForeignKey
ALTER TABLE "Activity" DROP CONSTRAINT "Activity_companyId_fkey";

-- DropForeignKey
ALTER TABLE "Activity" DROP CONSTRAINT "Activity_contactId_fkey";

-- DropForeignKey
ALTER TABLE "Activity" DROP CONSTRAINT "Activity_dealId_fkey";

-- DropForeignKey
ALTER TABLE "CompanyInsight" DROP CONSTRAINT "CompanyInsight_companyId_fkey";

-- DropForeignKey
ALTER TABLE "CompanyInsight" DROP CONSTRAINT "CompanyInsight_conversationId_fkey";

-- DropForeignKey
ALTER TABLE "Contact" DROP CONSTRAINT "Contact_companyId_fkey";

-- DropForeignKey
ALTER TABLE "ContactInsight" DROP CONSTRAINT "ContactInsight_contactId_fkey";

-- DropForeignKey
ALTER TABLE "ContactInsight" DROP CONSTRAINT "ContactInsight_conversationId_fkey";

-- DropForeignKey
ALTER TABLE "Deal" DROP CONSTRAINT "Deal_companyId_fkey";

-- DropForeignKey
ALTER TABLE "Deal" DROP CONSTRAINT "Deal_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "DealContact" DROP CONSTRAINT "DealContact_contactId_fkey";

-- DropForeignKey
ALTER TABLE "DealContact" DROP CONSTRAINT "DealContact_dealId_fkey";

-- DropForeignKey
ALTER TABLE "DealInsight" DROP CONSTRAINT "DealInsight_conversationId_fkey";

-- DropForeignKey
ALTER TABLE "DealInsight" DROP CONSTRAINT "DealInsight_dealId_fkey";

-- AlterTable
ALTER TABLE "Activity" DROP COLUMN "companyId",
DROP COLUMN "completedAt",
DROP COLUMN "dealId",
DROP COLUMN "scheduledAt",
ADD COLUMN     "accountId" TEXT,
ADD COLUMN     "activityDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "leadId" TEXT,
ADD COLUMN     "nextSteps" TEXT[],
ADD COLUMN     "opportunityId" TEXT;

-- AlterTable
ALTER TABLE "Contact" DROP COLUMN "companyId",
DROP COLUMN "timezone",
ADD COLUMN     "accountId" TEXT,
ADD COLUMN     "contactStatus" "ContactStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "doNotCall" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "doNotEmail" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "emailOptOut" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "influenceLevel" "InfluenceLevel",
ADD COLUMN     "lastCallDate" TIMESTAMP(3),
ADD COLUMN     "lastEmailDate" TIMESTAMP(3),
ADD COLUMN     "mailingCity" TEXT,
ADD COLUMN     "mailingCountry" TEXT,
ADD COLUMN     "mailingPostalCode" TEXT,
ADD COLUMN     "mailingState" TEXT,
ADD COLUMN     "mailingStreet" TEXT,
ADD COLUMN     "mobilePhone" TEXT,
ADD COLUMN     "ownerId" TEXT NOT NULL,
ADD COLUMN     "reportsToId" TEXT,
ADD COLUMN     "salutation" TEXT,
ADD COLUMN     "twitterHandle" TEXT;

-- DropTable
DROP TABLE "Company";

-- DropTable
DROP TABLE "CompanyInsight";

-- DropTable
DROP TABLE "ContactInsight";

-- DropTable
DROP TABLE "Deal";

-- DropTable
DROP TABLE "DealContact";

-- DropTable
DROP TABLE "DealInsight";

-- DropEnum
DROP TYPE "CompanySize";

-- DropEnum
DROP TYPE "DealStage";

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "company" TEXT,
    "title" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "leadSource" "LeadSource" NOT NULL DEFAULT 'OTHER',
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "rating" "LeadRating",
    "industry" TEXT,
    "numberOfEmployees" INTEGER,
    "annualRevenue" DOUBLE PRECISION,
    "street" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "country" TEXT,
    "isQualified" BOOLEAN NOT NULL DEFAULT false,
    "qualifiedDate" TIMESTAMP(3),
    "disqualifiedReason" TEXT,
    "leadScore" INTEGER,
    "buyingIntent" "BuyingIntent",
    "painPoints" TEXT[],
    "budget" DOUBLE PRECISION,
    "timeline" TEXT,
    "convertedDate" TIMESTAMP(3),
    "convertedAccountId" TEXT,
    "convertedContactId" TEXT,
    "convertedOpportunityId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "parentAccountId" TEXT,
    "name" TEXT NOT NULL,
    "website" TEXT,
    "domain" TEXT,
    "phone" TEXT,
    "fax" TEXT,
    "industry" TEXT,
    "type" "AccountType" NOT NULL DEFAULT 'PROSPECT',
    "numberOfEmployees" INTEGER,
    "annualRevenue" DOUBLE PRECISION,
    "description" TEXT,
    "billingStreet" TEXT,
    "billingCity" TEXT,
    "billingState" TEXT,
    "billingPostalCode" TEXT,
    "billingCountry" TEXT,
    "shippingStreet" TEXT,
    "shippingCity" TEXT,
    "shippingState" TEXT,
    "shippingPostalCode" TEXT,
    "shippingCountry" TEXT,
    "accountStatus" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "rating" "AccountRating",
    "healthScore" INTEGER,
    "lifetimeValue" DOUBLE PRECISION,
    "churnRisk" "ChurnRisk",
    "painPoints" TEXT[],
    "techStack" TEXT[],
    "competitors" TEXT[],
    "lastActivityDate" TIMESTAMP(3),
    "nextActivityDate" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Opportunity" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "campaignId" TEXT,
    "name" TEXT NOT NULL,
    "opportunitySource" "OpportunitySource",
    "type" "OpportunityType",
    "stage" "OpportunityStage" NOT NULL DEFAULT 'PROSPECTING',
    "amount" DOUBLE PRECISION,
    "probability" INTEGER,
    "expectedRevenue" DOUBLE PRECISION,
    "discount" DOUBLE PRECISION DEFAULT 0,
    "closeDate" TIMESTAMP(3),
    "createdDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActivityDate" TIMESTAMP(3),
    "nextActivityDate" TIMESTAMP(3),
    "needsAnalysis" TEXT,
    "proposedSolution" TEXT,
    "competitors" TEXT[],
    "nextStep" TEXT,
    "winProbability" DOUBLE PRECISION,
    "riskFactors" TEXT[],
    "recommendedActions" TEXT[],
    "dealVelocity" INTEGER,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "isWon" BOOLEAN NOT NULL DEFAULT false,
    "lostReason" TEXT,
    "closedDate" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Opportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpportunityContactRole" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "role" "ContactRole",
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OpportunityContactRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "assignedToId" TEXT,
    "leadId" TEXT,
    "accountId" TEXT,
    "contactId" TEXT,
    "opportunityId" TEXT,
    "subject" TEXT NOT NULL,
    "description" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "priority" "TaskPriority" NOT NULL DEFAULT 'NORMAL',
    "dueDate" TIMESTAMP(3),
    "reminderDate" TIMESTAMP(3),
    "completedDate" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "quoteNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "QuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discountPercent" DOUBLE PRECISION,
    "tax" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "shippingHandling" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "validUntil" TIMESTAMP(3),
    "paymentTerms" TEXT,
    "description" TEXT,
    "billingStreet" TEXT,
    "billingCity" TEXT,
    "billingState" TEXT,
    "billingPostalCode" TEXT,
    "billingCountry" TEXT,
    "shippingStreet" TEXT,
    "shippingCity" TEXT,
    "shippingState" TEXT,
    "shippingPostalCode" TEXT,
    "shippingCountry" TEXT,
    "sentDate" TIMESTAMP(3),
    "acceptedDate" TIMESTAMP(3),
    "rejectedDate" TIMESTAMP(3),
    "rejectedReason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteLineItem" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "productCode" TEXT,
    "description" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "listPrice" DOUBLE PRECISION NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "sortOrder" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuoteLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "quoteId" TEXT,
    "ownerId" TEXT NOT NULL,
    "contractNumber" TEXT NOT NULL,
    "contractName" TEXT NOT NULL,
    "status" "ContractStatus" NOT NULL DEFAULT 'DRAFT',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "contractTerm" INTEGER,
    "contractValue" DOUBLE PRECISION,
    "billingFrequency" TEXT,
    "autoRenew" BOOLEAN NOT NULL DEFAULT false,
    "renewalDate" TIMESTAMP(3),
    "renewalNoticeDate" TIMESTAMP(3),
    "renewalReminder" BOOLEAN NOT NULL DEFAULT false,
    "signedDate" TIMESTAMP(3),
    "activatedDate" TIMESTAMP(3),
    "terminatedDate" TIMESTAMP(3),
    "terminationReason" TEXT,
    "description" TEXT,
    "specialTerms" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "campaignType" TEXT,
    "status" "CampaignStatus" NOT NULL DEFAULT 'PLANNED',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "budgetedCost" DOUBLE PRECISION,
    "actualCost" DOUBLE PRECISION,
    "expectedRevenue" DOUBLE PRECISION,
    "description" TEXT,
    "numSent" INTEGER NOT NULL DEFAULT 0,
    "numResponses" INTEGER NOT NULL DEFAULT 0,
    "numConverted" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "leadId" TEXT,
    "accountId" TEXT,
    "contactId" TEXT,
    "opportunityId" TEXT,
    "title" TEXT,
    "body" TEXT NOT NULL,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Lead_email_key" ON "Lead"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_domain_key" ON "Account"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "OpportunityContactRole_opportunityId_contactId_key" ON "OpportunityContactRole"("opportunityId", "contactId");

-- CreateIndex
CREATE UNIQUE INDEX "Quote_quoteNumber_key" ON "Quote"("quoteNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Contract_quoteId_key" ON "Contract"("quoteId");

-- CreateIndex
CREATE UNIQUE INDEX "Contract_contractNumber_key" ON "Contract"("contractNumber");

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_parentAccountId_fkey" FOREIGN KEY ("parentAccountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_reportsToId_fkey" FOREIGN KEY ("reportsToId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityContactRole" ADD CONSTRAINT "OpportunityContactRole_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityContactRole" ADD CONSTRAINT "OpportunityContactRole_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteLineItem" ADD CONSTRAINT "QuoteLineItem_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
