-- CreateTable
CREATE TABLE "manual_business_reports" (
    "id" SERIAL NOT NULL,
    "month" TEXT NOT NULL,
    "revenue_amount" DECIMAL(12,2) NOT NULL,
    "cost_amount" DECIMAL(12,2) NOT NULL,
    "profit_amount" DECIMAL(12,2) NOT NULL,
    "note" TEXT,
    "created_by_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "manual_business_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manual_salary_reports" (
    "id" SERIAL NOT NULL,
    "month" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "base_salary" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "commission" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "bonus" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "deduction" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "social_insurance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "note" TEXT,
    "created_by_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "manual_salary_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "manual_salary_reports_month_user_id_key" ON "manual_salary_reports"("month", "user_id");

-- AddForeignKey
ALTER TABLE "manual_business_reports" ADD CONSTRAINT "manual_business_reports_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manual_salary_reports" ADD CONSTRAINT "manual_salary_reports_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manual_salary_reports" ADD CONSTRAINT "manual_salary_reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
