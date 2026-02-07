-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "feedbackAt" TIMESTAMP(3),
ADD COLUMN     "feedbackComment" TEXT;

-- CreateTable
CREATE TABLE "FeedbackEntry" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" "FeedbackValue" NOT NULL,
    "comment" TEXT,
    "userQuery" TEXT NOT NULL,
    "systemPrompt" TEXT,
    "toolsUsed" TEXT[],
    "responseTime" DOUBLE PRECISION,
    "category" TEXT,
    "tags" TEXT[],
    "accuracyScore" INTEGER,
    "helpfulnessScore" INTEGER,
    "clarityScore" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedbackEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreferencePair" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "systemPrompt" TEXT,
    "chosenId" TEXT NOT NULL,
    "rejectedId" TEXT NOT NULL,
    "preferenceStrength" DOUBLE PRECISION,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PreferencePair_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoldenExample" (
    "id" TEXT NOT NULL,
    "userQuery" TEXT NOT NULL,
    "assistantResponse" TEXT NOT NULL,
    "avgRating" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "category" TEXT NOT NULL,
    "tags" TEXT[],
    "sourceMessageId" TEXT,
    "isManuallyAdded" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoldenExample_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FeedbackEntry_messageId_key" ON "FeedbackEntry"("messageId");

-- AddForeignKey
ALTER TABLE "FeedbackEntry" ADD CONSTRAINT "FeedbackEntry_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackEntry" ADD CONSTRAINT "FeedbackEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreferencePair" ADD CONSTRAINT "PreferencePair_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreferencePair" ADD CONSTRAINT "PreferencePair_chosenId_fkey" FOREIGN KEY ("chosenId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreferencePair" ADD CONSTRAINT "PreferencePair_rejectedId_fkey" FOREIGN KEY ("rejectedId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;
