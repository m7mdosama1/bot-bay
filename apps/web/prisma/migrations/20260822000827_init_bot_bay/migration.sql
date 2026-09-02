-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "avatar" TEXT,
    "is_admin" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "bots" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tagline" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "features" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "permissions" TEXT NOT NULL,
    "icon_url" TEXT,
    "color_accent" TEXT NOT NULL DEFAULT '#F2A93B',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "guilds" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "icon_url" TEXT,
    "owner_id" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "guild_bots" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guild_id" TEXT NOT NULL,
    "bot_id" TEXT NOT NULL,
    "added_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "guild_bots_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guilds" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "guild_bots_bot_id_fkey" FOREIGN KEY ("bot_id") REFERENCES "bots" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "giveaways" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guild_id" TEXT NOT NULL,
    "channel_id" TEXT NOT NULL,
    "message_id" TEXT,
    "prize" TEXT NOT NULL,
    "winners_count" INTEGER NOT NULL DEFAULT 1,
    "ends_at" TIMESTAMP NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "giveaways_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guilds" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "roulette_configs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guild_id" TEXT NOT NULL,
    "min_bet" INTEGER NOT NULL DEFAULT 10,
    "max_bet" INTEGER NOT NULL DEFAULT 1000,
    "currency_name" TEXT NOT NULL DEFAULT 'عملة',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "roulette_configs_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guilds" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "moderation_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guild_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target_user_id" TEXT NOT NULL,
    "moderator_id" TEXT NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "moderation_logs_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guilds" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "verification_configs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guild_id" TEXT NOT NULL,
    "verify_channel_id" TEXT NOT NULL,
    "unverified_role_id" TEXT NOT NULL,
    "verified_role_id" TEXT NOT NULL,
    "vpn_check_enabled" BOOLEAN NOT NULL DEFAULT true,
    "alt_check_enabled" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "verification_configs_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guilds" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "verification_attempts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guild_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "ip_hash" TEXT,
    "fingerprint_hash" TEXT,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "verification_attempts_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guilds" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "welcome_configs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guild_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "message_text" TEXT NOT NULL,
    "image_url" TEXT,
    "delete_after_min" INTEGER NOT NULL DEFAULT 5,
    CONSTRAINT "welcome_configs_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guilds" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "tickets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guild_id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "channel_id" TEXT NOT NULL,
    "type" TEXT,
    "opened_by" TEXT NOT NULL,
    "claimed_by" TEXT,
    "closed_by" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "transcript_content" TEXT,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimed_at" TIMESTAMP,
    "closed_at" TIMESTAMP,
    CONSTRAINT "tickets_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guilds" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "bots_slug_key" ON "bots"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "guild_bots_guild_id_bot_id_key" ON "guild_bots"("guild_id", "bot_id");

-- CreateIndex
CREATE UNIQUE INDEX "roulette_configs_guild_id_key" ON "roulette_configs"("guild_id");

-- CreateIndex
CREATE UNIQUE INDEX "verification_configs_guild_id_key" ON "verification_configs"("guild_id");

-- CreateIndex
CREATE UNIQUE INDEX "welcome_configs_guild_id_key" ON "welcome_configs"("guild_id");
