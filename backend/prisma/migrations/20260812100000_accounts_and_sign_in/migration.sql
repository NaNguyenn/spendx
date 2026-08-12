-- CreateEnum
CREATE TYPE "supported_currency" AS ENUM ('VND', 'USD', 'EUR', 'GBP', 'JPY', 'SGD', 'AUD', 'CAD', 'KRW', 'THB');

-- CreateEnum
CREATE TYPE "locale" AS ENUM ('en', 'vi');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "locale" "locale" NOT NULL,
ADD COLUMN     "passwordHash" TEXT NOT NULL,
ADD COLUMN     "preferredCurrency" "supported_currency" NOT NULL;

