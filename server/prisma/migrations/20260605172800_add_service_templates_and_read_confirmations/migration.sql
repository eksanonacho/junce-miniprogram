-- CreateTable
CREATE TABLE "service_templates" (
    "id" SERIAL NOT NULL,
    "service_type" TEXT NOT NULL,
    "required_materials" JSONB,
    "process_steps" JSONB,
    "estimated_duration" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_read_confirmations" (
    "id" SERIAL NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "service_item_id" INTEGER,
    "template_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "confirmed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_read_confirmations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "service_read_confirmations_customer_id_template_id_user_id_key" ON "service_read_confirmations"("customer_id", "template_id", "user_id");

-- AddForeignKey
ALTER TABLE "service_read_confirmations" ADD CONSTRAINT "service_read_confirmations_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_read_confirmations" ADD CONSTRAINT "service_read_confirmations_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "service_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_read_confirmations" ADD CONSTRAINT "service_read_confirmations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
