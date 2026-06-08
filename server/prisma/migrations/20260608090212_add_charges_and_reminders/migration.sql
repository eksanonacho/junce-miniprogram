-- CreateEnum
CREATE TYPE "ChargeMode" AS ENUM ('一次性', '定金加尾款');

-- CreateEnum
CREATE TYPE "ChargeStatus" AS ENUM ('已收', '未收');

-- CreateTable
CREATE TABLE "charges" (
    "id" SERIAL NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "charge_mode" "ChargeMode" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "charge_status" "ChargeStatus" NOT NULL DEFAULT '未收',
    "contract_no" TEXT,
    "invoice_no" TEXT,
    "confirmed_by" INTEGER,
    "confirmed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "charges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collection_reminders" (
    "id" SERIAL NOT NULL,
    "charge_id" INTEGER NOT NULL,
    "from_user_id" INTEGER NOT NULL,
    "to_user_id" INTEGER NOT NULL,
    "message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collection_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "charges_customer_id_key" ON "charges"("customer_id");

-- AddForeignKey
ALTER TABLE "charges" ADD CONSTRAINT "charges_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charges" ADD CONSTRAINT "charges_confirmed_by_fkey" FOREIGN KEY ("confirmed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_reminders" ADD CONSTRAINT "collection_reminders_charge_id_fkey" FOREIGN KEY ("charge_id") REFERENCES "charges"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_reminders" ADD CONSTRAINT "collection_reminders_from_user_id_fkey" FOREIGN KEY ("from_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_reminders" ADD CONSTRAINT "collection_reminders_to_user_id_fkey" FOREIGN KEY ("to_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
