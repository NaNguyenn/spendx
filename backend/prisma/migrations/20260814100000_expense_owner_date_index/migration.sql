-- Personal statistics (issue #7) filter on exactly (ownerId, expenseDate) —
-- grouping is by Expense Date, never Logged At — and only
-- expenses_ownerId_loggedAt_idx existed.
CREATE INDEX "expenses_ownerId_expenseDate_idx" ON "expenses"("ownerId", "expenseDate");
