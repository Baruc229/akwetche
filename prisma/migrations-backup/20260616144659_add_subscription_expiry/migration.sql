-- AlterTable: Add notification fields to Subscription
ALTER TABLE "Subscription" ADD COLUMN "notifiedAt7Days" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Subscription" ADD COLUMN "notifiedAt3Days" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Subscription" ADD COLUMN "notifiedAtExpiry" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Subscription" ADD COLUMN "weeklyReminderCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable: SubscriptionHistory
CREATE TABLE "SubscriptionHistory" (
    "id" SERIAL NOT NULL,
    "status" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT '',
    "method" TEXT NOT NULL DEFAULT '',
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 5000,
    "currency" TEXT NOT NULL DEFAULT 'XOF',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER NOT NULL,
    CONSTRAINT "SubscriptionHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SubscriptionHistory_userId_idx" ON "SubscriptionHistory"("userId");

ALTER TABLE "SubscriptionHistory" ADD CONSTRAINT "SubscriptionHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Applied via db push. Marked as resolved.