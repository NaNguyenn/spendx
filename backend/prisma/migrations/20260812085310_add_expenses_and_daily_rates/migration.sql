-- CreateEnum
CREATE TYPE "category" AS ENUM ('housing', 'food', 'leisure', 'investment', 'other');

-- CreateEnum
CREATE TYPE "visibility" AS ENUM ('private', 'friend_only', 'public');

-- CreateTable
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "originalAmount" DECIMAL(20,4) NOT NULL,
    "originalCurrency" "supported_currency" NOT NULL,
    "convertedAmount" DECIMAL(20,4) NOT NULL,
    "convertedCurrency" "supported_currency" NOT NULL,
    "category" "category" NOT NULL,
    "visibility" "visibility" NOT NULL,
    "expenseDate" DATE NOT NULL,
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_rates" (
    "id" TEXT NOT NULL,
    "baseCurrency" "supported_currency" NOT NULL,
    "quoteCurrency" "supported_currency" NOT NULL,
    "rateDate" DATE NOT NULL,
    "rate" DECIMAL(24,10) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_rates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "expenses_ownerId_loggedAt_idx" ON "expenses"("ownerId", "loggedAt");

-- CreateIndex
CREATE UNIQUE INDEX "daily_rates_baseCurrency_quoteCurrency_rateDate_key" ON "daily_rates"("baseCurrency", "quoteCurrency", "rateDate");

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
