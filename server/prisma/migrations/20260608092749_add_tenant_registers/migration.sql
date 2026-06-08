-- CreateTable
CREATE TABLE "tenant_registers" (
    "id" SERIAL NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "enterprise_detail" JSONB,
    "service_plan" JSONB,
    "plan_confirmed_by_owner" BOOLEAN NOT NULL DEFAULT false,
    "plan_confirmed_at" TIMESTAMP(3),
    "assigned_accountant_id" INTEGER,
    "assign_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "assign_confirmed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_registers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenant_registers_customer_id_key" ON "tenant_registers"("customer_id");

-- AddForeignKey
ALTER TABLE "tenant_registers" ADD CONSTRAINT "tenant_registers_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_registers" ADD CONSTRAINT "tenant_registers_assigned_accountant_id_fkey" FOREIGN KEY ("assigned_accountant_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
