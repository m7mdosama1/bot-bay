ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "is_banned" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "banned_at" TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "ban_reason" TEXT;

ALTER TABLE "guild_bots"
  ADD COLUMN IF NOT EXISTS "is_admin_blocked" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "admin_blocked_at" TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "admin_block_reason" TEXT;

CREATE TABLE IF NOT EXISTS "admin_audit_logs" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "admin_user_id" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "target_type" TEXT NOT NULL,
  "target_id" TEXT NOT NULL,
  "reason" TEXT,
  "metadata" TEXT,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "admin_audit_logs_created_at_idx"
  ON "admin_audit_logs"("created_at");

CREATE INDEX IF NOT EXISTS "admin_audit_logs_target_idx"
  ON "admin_audit_logs"("target_type", "target_id");