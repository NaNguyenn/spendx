-- ADR-0008: the Conversion Snapshot replaces the single owner-currency
-- Converted Amount. Expense rows logged before this migration have no
-- snapshot and no way to derive one (their logging dates predate any Daily
-- Rate coverage), so they are deleted rather than left readable-but-broken.
-- Development data only — no production deployment exists.
DELETE FROM "expenses";

-- AlterTable
ALTER TABLE "expenses" DROP COLUMN "convertedAmount",
DROP COLUMN "convertedCurrency";

-- CreateTable
CREATE TABLE "expense_conversions" (
    "expenseId" TEXT NOT NULL,
    "currency" "supported_currency" NOT NULL,
    "amount" DECIMAL(20,4) NOT NULL,

    CONSTRAINT "expense_conversions_pkey" PRIMARY KEY ("expenseId","currency")
);

-- AddForeignKey
ALTER TABLE "expense_conversions" ADD CONSTRAINT "expense_conversions_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
