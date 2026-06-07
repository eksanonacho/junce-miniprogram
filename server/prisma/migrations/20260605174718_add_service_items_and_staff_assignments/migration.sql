-- CreateEnum
CREATE TYPE "ItemStatus" AS ENUM ('待办', '办件中', '办结');

-- CreateTable
CREATE TABLE "service_items" (
    "id" SERIAL NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "service_template_id" INTEGER NOT NULL,
    "status" "ItemStatus" NOT NULL DEFAULT '待办',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_assignments" (
    "id" SERIAL NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "business_staff_id" INTEGER,
    "accountant_id" INTEGER,
    "consultant_id" INTEGER,
    "general_affairs_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "service_items_customer_id_service_template_id_key" ON "service_items"("customer_id", "service_template_id");

-- CreateIndex
CREATE UNIQUE INDEX "staff_assignments_customer_id_key" ON "staff_assignments"("customer_id");

-- AddForeignKey
ALTER TABLE "service_items" ADD CONSTRAINT "service_items_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_items" ADD CONSTRAINT "service_items_service_template_id_fkey" FOREIGN KEY ("service_template_id") REFERENCES "service_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_assignments" ADD CONSTRAINT "staff_assignments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_assignments" ADD CONSTRAINT "staff_assignments_business_staff_id_fkey" FOREIGN KEY ("business_staff_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_assignments" ADD CONSTRAINT "staff_assignments_accountant_id_fkey" FOREIGN KEY ("accountant_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_assignments" ADD CONSTRAINT "staff_assignments_consultant_id_fkey" FOREIGN KEY ("consultant_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_assignments" ADD CONSTRAINT "staff_assignments_general_affairs_id_fkey" FOREIGN KEY ("general_affairs_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
