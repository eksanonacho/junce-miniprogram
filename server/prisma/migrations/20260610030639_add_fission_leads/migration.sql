-- CreateEnum
CREATE TYPE "FissionStatus" AS ENUM ('待确认', '已确认', '已归档', '无效');

-- CreateTable
CREATE TABLE "fission_leads" (
    "id" SERIAL NOT NULL,
    "source_customer_id" INTEGER,
    "initiated_by_id" INTEGER NOT NULL,
    "price" DECIMAL(12,2),
    "lead_name" TEXT,
    "contact_name" TEXT,
    "phone" TEXT,
    "description" TEXT,
    "assignee_id" INTEGER,
    "status" "FissionStatus" NOT NULL DEFAULT '待确认',
    "confirmed_by_id" INTEGER,
    "confirmed_at" TIMESTAMP(3),
    "archived_by_id" INTEGER,
    "archived_at" TIMESTAMP(3),
    "archive_files" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fission_leads_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "fission_leads" ADD CONSTRAINT "fission_leads_source_customer_id_fkey" FOREIGN KEY ("source_customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fission_leads" ADD CONSTRAINT "fission_leads_initiated_by_id_fkey" FOREIGN KEY ("initiated_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fission_leads" ADD CONSTRAINT "fission_leads_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fission_leads" ADD CONSTRAINT "fission_leads_confirmed_by_id_fkey" FOREIGN KEY ("confirmed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fission_leads" ADD CONSTRAINT "fission_leads_archived_by_id_fkey" FOREIGN KEY ("archived_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
