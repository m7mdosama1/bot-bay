CREATE TABLE "pulse_configs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guild_id" TEXT NOT NULL UNIQUE,
    "enabled" BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE "ascend_configs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guild_id" TEXT NOT NULL UNIQUE,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "xp_cooldown_seconds" INTEGER NOT NULL DEFAULT 60,
    "xp_per_message_min" INTEGER NOT NULL DEFAULT 15,
    "xp_per_message_max" INTEGER NOT NULL DEFAULT 25
);