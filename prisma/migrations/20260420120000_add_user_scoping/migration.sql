-- User scoping: public.users + user_id on financial tables. Existing rows → legacy owner.

CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

INSERT INTO "users" ("id", "email")
VALUES ('00000000-0000-4000-8000-000000000001', 'legacy-owner@local');

ALTER TABLE "accounts" ADD COLUMN "user_id" UUID;
UPDATE "accounts" SET "user_id" = '00000000-0000-4000-8000-000000000001' WHERE "user_id" IS NULL;
ALTER TABLE "accounts" ALTER COLUMN "user_id" SET NOT NULL;

ALTER TABLE "uploads" ADD COLUMN "user_id" UUID;
UPDATE "uploads" SET "user_id" = '00000000-0000-4000-8000-000000000001' WHERE "user_id" IS NULL;
ALTER TABLE "uploads" ALTER COLUMN "user_id" SET NOT NULL;

ALTER TABLE "transactions" ADD COLUMN "user_id" UUID;
UPDATE "transactions" SET "user_id" = '00000000-0000-4000-8000-000000000001' WHERE "user_id" IS NULL;
ALTER TABLE "transactions" ALTER COLUMN "user_id" SET NOT NULL;

ALTER TABLE "workbook_sheet1_snapshots" ADD COLUMN "user_id" UUID;
UPDATE "workbook_sheet1_snapshots" SET "user_id" = '00000000-0000-4000-8000-000000000001' WHERE "user_id" IS NULL;
ALTER TABLE "workbook_sheet1_snapshots" ALTER COLUMN "user_id" SET NOT NULL;

CREATE INDEX "ix_accounts_user_id" ON "accounts"("user_id");
CREATE INDEX "ix_uploads_user_id" ON "uploads"("user_id");
CREATE INDEX "ix_transactions_user_id" ON "transactions"("user_id");
CREATE INDEX "ix_sheet1_user_id" ON "workbook_sheet1_snapshots"("user_id");

ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workbook_sheet1_snapshots" ADD CONSTRAINT "workbook_sheet1_snapshots_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
