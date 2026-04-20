-- Dedupe default account per user (name unique within user)
CREATE UNIQUE INDEX "uq_accounts_user_name" ON "accounts"("user_id", "name");
