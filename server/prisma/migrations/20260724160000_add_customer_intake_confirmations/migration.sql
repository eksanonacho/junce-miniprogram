ALTER TABLE "customers"
ADD COLUMN "intake_submitted_at" TIMESTAMP(3);

CREATE TABLE "intake_assignment_confirmations" (
    "id" SERIAL NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "position" TEXT NOT NULL,
    "confirmed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "intake_assignment_confirmations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "unique_intake_assignment_confirmation"
ON "intake_assignment_confirmations"("customer_id", "user_id", "position");

CREATE INDEX "intake_assignment_confirmations_customer_id_idx"
ON "intake_assignment_confirmations"("customer_id");

CREATE INDEX "intake_assignment_confirmations_user_id_idx"
ON "intake_assignment_confirmations"("user_id");

ALTER TABLE "intake_assignment_confirmations"
ADD CONSTRAINT "intake_assignment_confirmations_customer_id_fkey"
FOREIGN KEY ("customer_id") REFERENCES "customers"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "intake_assignment_confirmations"
ADD CONSTRAINT "intake_assignment_confirmations_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
