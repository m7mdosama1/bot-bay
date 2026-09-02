CREATE TABLE IF NOT EXISTS "feeds" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guild_id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "source_ref" TEXT NOT NULL,
    "target_channel_id" TEXT NOT NULL,
    "embed_template" TEXT NOT NULL DEFAULT '{}',
    "webhook_secret" TEXT,
    "last_posted_ref" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "feeds_guild_id_idx" ON "feeds"("guild_id");