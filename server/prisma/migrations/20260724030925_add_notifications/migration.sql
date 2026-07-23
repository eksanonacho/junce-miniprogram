-- CreateTable
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "sender_id" INTEGER,
    "receiver_id" INTEGER NOT NULL,
    "role_target" TEXT,
    "target_type" TEXT,
    "target_id" INTEGER,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_receiver_id_is_read_idx" ON "notifications"("receiver_id", "is_read");

-- CreateIndex
CREATE INDEX "notifications_receiver_id_created_at_idx" ON "notifications"("receiver_id", "created_at");
