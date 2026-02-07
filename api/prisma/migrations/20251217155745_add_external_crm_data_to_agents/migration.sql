-- AlterTable
ALTER TABLE "agent_definitions" ADD COLUMN     "externalCrmProvider" TEXT,
ADD COLUMN     "useExternalCrmData" BOOLEAN NOT NULL DEFAULT false;
