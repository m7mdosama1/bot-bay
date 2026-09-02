ALTER TABLE "verification_configs" ADD COLUMN IF NOT EXISTS "panel_message_id" TEXT;
ALTER TABLE "welcome_configs" ALTER COLUMN "category_id" DROP NOT NULL;
ALTER TABLE "welcome_configs" ADD COLUMN IF NOT EXISTS "channel_id" TEXT;
ALTER TABLE "welcome_configs" ADD COLUMN IF NOT EXISTS "role_id" TEXT;
ALTER TABLE "welcome_configs" ADD COLUMN IF NOT EXISTS "embed_color" TEXT NOT NULL DEFAULT '#3CFF4A';
ALTER TABLE "welcome_configs" ADD COLUMN IF NOT EXISTS "show_avatar" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "welcome_configs" ADD COLUMN IF NOT EXISTS "show_banner" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS "ticket_configs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guild_id" TEXT NOT NULL UNIQUE,
    "channel_id" TEXT,
    "category_id" TEXT,
    "log_channel_id" TEXT,
    "panel_message_id" TEXT
);