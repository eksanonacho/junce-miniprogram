-- CreateEnum
CREATE TYPE "WorkOrderStatus" AS ENUM ('待办', '办件中', '办结', '已打卡');

-- CreateTable
CREATE TABLE "work_orders" (
    "id" SERIAL NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "service_item_id" INTEGER NOT NULL,
    "handler_id" INTEGER,
    "status" "WorkOrderStatus" NOT NULL DEFAULT '待办',
    "receipt_receiver_id" INTEGER,
    "archive_files" JSONB,
    "completed_at" TIMESTAMP(3),
    "checked_in_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "work_orders_service_item_id_key" ON "work_orders"("service_item_id");

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_service_item_id_fkey" FOREIGN KEY ("service_item_id") REFERENCES "service_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_handler_id_fkey" FOREIGN KEY ("handler_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_receipt_receiver_id_fkey" FOREIGN KEY ("receipt_receiver_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
