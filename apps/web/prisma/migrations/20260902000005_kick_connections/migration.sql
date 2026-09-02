CREATE TABLE IF NOT EXISTS "kick_connections" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "guild_id" TEXT NOT NULL UNIQUE,
  "discord_user_id" TEXT NOT NULL,
  "kick_user_id" TEXT,
  "kick_username" TEXT,
  "access_token" TEXT NOT NULL,
  "refresh_token" TEXT,
  "expires_at" TIMESTAMP,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "kick_connections_guild_id_fkey"
    FOREIGN KEY ("guild_id") REFERENCES "guilds"("id") ON DELETE CASCADE ON UPDATE CASCADE
);