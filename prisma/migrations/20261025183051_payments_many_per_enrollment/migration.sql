-- DropIndex
DROP INDEX "Payment_enrollmentId_key";

-- CreateIndex
CREATE INDEX "Payment_enrollmentId_idx" ON "Payment"("enrollmentId");
