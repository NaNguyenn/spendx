-- CreateIndex
CREATE INDEX "expenses_visibility_loggedAt_id_idx" ON "expenses"("visibility", "loggedAt", "id");
