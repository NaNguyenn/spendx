-- CreateEnum
CREATE TYPE "one_time_code_purpose" AS ENUM ('email_verification', 'password_reset');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "emailVerifiedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "one_time_codes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "purpose" "one_time_code_purpose" NOT NULL,
    "codeHash" TEXT NOT NULL,
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "one_time_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "one_time_codes_userId_purpose_key" ON "one_time_codes"("userId", "purpose");

-- AddForeignKey
ALTER TABLE "one_time_codes" ADD CONSTRAINT "one_time_codes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
