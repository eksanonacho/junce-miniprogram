-- CreateEnum
CREATE TYPE "RoleCode" AS ENUM ('商务', '业务', '会计', '主管', '总务', '管理员');

-- CreateEnum
CREATE TYPE "CompanyType" AS ENUM ('一人公司', '多股东', '个体户');

-- CreateEnum
CREATE TYPE "CustomerCategory" AS ENUM ('新用户', '代理户');

-- CreateEnum
CREATE TYPE "CustomerTier" AS ENUM ('VIP', '优质', '中低', '零申报');

-- CreateEnum
CREATE TYPE "LifecycleStage" AS ENUM ('填单', '办件中', '办结', '维护中', '出库');

-- CreateTable
CREATE TABLE "roles" (
    "id" SERIAL NOT NULL,
    "code" "RoleCode" NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "real_name" TEXT NOT NULL,
    "phone" TEXT,
    "role_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" SERIAL NOT NULL,
    "company_name" TEXT NOT NULL,
    "industry" TEXT,
    "register_date" TIMESTAMP(3),
    "tax_type" TEXT,
    "region" TEXT,
    "annual_revenue" DECIMAL(65,30),
    "staff_count" INTEGER,
    "company_type" "CompanyType",
    "customer_category" "CustomerCategory" NOT NULL,
    "tier" "CustomerTier",
    "lifecycle_stage" "LifecycleStage" NOT NULL DEFAULT '填单',
    "owner_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_code_key" ON "roles"("code");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
