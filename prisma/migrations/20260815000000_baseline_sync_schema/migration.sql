-- DropForeignKey
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_categoryId_fkey";

-- AlterTable
ALTER TABLE "StockMovement" ADD COLUMN     "saleId" INTEGER;

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "generationKey" TEXT,
ADD COLUMN     "recurring" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "saleId" INTEGER,
ALTER COLUMN "categoryId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "adminNotificationPref" TEXT NOT NULL DEFAULT 'instant',
ADD COLUMN     "avatarUrl" TEXT,
ADD COLUMN     "baseCurrency" TEXT NOT NULL DEFAULT 'XOF',
ADD COLUMN     "countryCode" TEXT,
ADD COLUMN     "notificationPrefs" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "phone" TEXT,
ALTER COLUMN "currency" SET DEFAULT 'XOF';

-- CreateTable
CREATE TABLE "Session" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "ipAddress" TEXT NOT NULL DEFAULT '',
    "userAgent" TEXT NOT NULL DEFAULT '',
    "lastActive" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PendingAdminEmail" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "PendingAdminEmail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" SERIAL NOT NULL,
    "provider" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringTemplate" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "type" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'personal',
    "dayOfMonth" INTEGER NOT NULL,
    "categoryId" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "RecurringTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Budget" (
    "id" SERIAL NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'personal',
    "amount" DOUBLE PRECISION NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "Budget_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_token_idx" ON "Session"("token");

-- CreateIndex
CREATE INDEX "PendingAdminEmail_sentAt_idx" ON "PendingAdminEmail"("sentAt");

-- CreateIndex
CREATE INDEX "WebhookEvent_createdAt_idx" ON "WebhookEvent"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookEvent_provider_eventId_key" ON "WebhookEvent"("provider", "eventId");

-- CreateIndex
CREATE INDEX "RecurringTemplate_userId_active_idx" ON "RecurringTemplate"("userId", "active");

-- CreateIndex
CREATE INDEX "Budget_userId_month_year_idx" ON "Budget"("userId", "month", "year");

-- CreateIndex
CREATE UNIQUE INDEX "Budget_userId_categoryId_scope_month_year_key" ON "Budget"("userId", "categoryId", "scope", "month", "year");

-- CreateIndex
CREATE INDEX "StockMovement_saleId_idx" ON "StockMovement"("saleId");

-- CreateIndex
CREATE UNIQUE INDEX "TontineCotisation_tontineId_membreId_periode_key" ON "TontineCotisation"("tontineId", "membreId", "periode");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_generationKey_key" ON "Transaction"("generationKey");

-- CreateIndex
CREATE INDEX "Transaction_saleId_idx" ON "Transaction"("saleId");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringTemplate" ADD CONSTRAINT "RecurringTemplate_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringTemplate" ADD CONSTRAINT "RecurringTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

