CREATE TABLE "accounting_work_logs" (
    "id" SERIAL NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "accountant_id" INTEGER NOT NULL,
    "record_type" TEXT NOT NULL,
    "record_date" TIMESTAMP(3) NOT NULL,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT '已登记',
    "remark" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounting_work_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "accounting_work_logs_accountant_id_record_date_idx"
ON "accounting_work_logs"("accountant_id", "record_date");

CREATE INDEX "accounting_work_logs_customer_id_record_date_idx"
ON "accounting_work_logs"("customer_id", "record_date");

CREATE INDEX "accounting_work_logs_record_type_record_date_idx"
ON "accounting_work_logs"("record_type", "record_date");

ALTER TABLE "accounting_work_logs"
ADD CONSTRAINT "accounting_work_logs_customer_id_fkey"
FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "accounting_work_logs"
ADD CONSTRAINT "accounting_work_logs_accountant_id_fkey"
FOREIGN KEY ("accountant_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "accounting_work_logs"
ADD CONSTRAINT "accounting_work_logs_reviewed_by_id_fkey"
FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
