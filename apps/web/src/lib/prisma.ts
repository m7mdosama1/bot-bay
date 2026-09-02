import { Pool } from "pg";
import { randomBytes } from "crypto";

let pool: Pool | null = null;

function getPool() {
  if (!pool) {
    let connectionString = process.env.DATABASE_URL || "";
    if (!connectionString) {
      throw new Error("DATABASE_URL is not set");
    }

    // Remove sslmode and channel_binding from URL since pg handles SSL via its own config
    try {
      const url = new URL(connectionString);
      url.searchParams.delete("sslmode");
      url.searchParams.delete("channel_binding");
      connectionString = url.toString();
    } catch {
      // If URL parsing fails, use the original string
    }

    let ssl: any = undefined;
    if (!connectionString.includes("localhost")) {
      ssl = { rejectUnauthorized: false };
    }

    const client = new Pool({
      connectionString,
      ssl,
      max: 2,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 30000,
    });

    pool = client;
  }
  return pool;
}

export const db = {
  query: async (text: string, params?: any[]) => {
    return getPool().query(text, params);
  },
  getClient: () => getPool().connect(),
};

export async function getUserById(id: string) {
  const result = await db.query(
    "SELECT id, username, avatar, is_admin as \"isAdmin\", created_at as \"createdAt\" FROM users WHERE id = $1",
    [id]
  );
  return result.rows[0] || null;
}

export async function upsertUser(id: string, username: string, avatar: string | null) {
  const result = await db.query(
    "INSERT INTO users (id, username, avatar, is_admin, created_at) VALUES ($1, $2, $3, false, NOW()) ON CONFLICT (id) DO UPDATE SET username = $2, avatar = $3 RETURNING id, username, avatar, is_admin as \"isAdmin\", created_at as \"createdAt\"",
    [id, username, avatar]
  );
  return result.rows[0];
}

export async function markAdminIfAllowlisted(id: string, username: string, avatar: string | null) {
  const ADMIN_ALLOWLIST = process.env.ADMIN_ALLOWLIST?.split(",").map(s => s.trim()).filter(Boolean) || [];
  const isAdmin = ADMIN_ALLOWLIST.includes(id);

  const result = await db.query(
    `INSERT INTO users (id, username, avatar, is_admin, created_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (id) DO UPDATE SET
       username = $2,
       avatar = $3,
       is_admin = (users.is_admin OR $4)
     RETURNING id, username, avatar, is_admin as "isAdmin", created_at as "createdAt"`,
    [id, username, avatar, isAdmin]
  );
  return result.rows[0];
}

export async function getActiveBots() {
  const result = await db.query(
    "SELECT id, slug, name, tagline, description, features, client_id as \"clientId\", permissions, icon_url as \"iconUrl\", color_accent as \"colorAccent\", is_active as \"isActive\", created_at as \"createdAt\" FROM bots WHERE is_active = true ORDER BY created_at DESC"
  );
  return result.rows;
}

export async function getBotBySlug(slug: string) {
  const result = await db.query(
    "SELECT id, slug, name, tagline, description, features, client_id as \"clientId\", permissions, icon_url as \"iconUrl\", color_accent as \"colorAccent\", is_active as \"isActive\", created_at as \"createdAt\" FROM bots WHERE slug = $1 AND is_active = true",
    [slug]
  );
  return result.rows[0] || null;
}

export async function getGuildById(guildId: string, include?: { guildBots?: boolean; withBots?: boolean }) {
  let result: any;

  if (include?.withBots) {
    result = await db.query(
      "SELECT g.*, gb.bot_id as \"botId\", b.name as \"botName\", b.slug as \"botSlug\", b.color_accent as \"botColorAccent\", b.icon_url as \"botIconUrl\", gb.is_active as \"isActive\", gb.added_at as \"addedAt\" FROM guilds g LEFT JOIN guild_bots gb ON g.id = gb.guild_id LEFT JOIN bots b ON gb.bot_id = b.id WHERE g.id = $1 ORDER BY gb.added_at DESC",
      [guildId]
    );

    if (result.rows.length === 0) {
      const guildResult = await db.query("SELECT * FROM guilds WHERE id = $1", [guildId]);
      return guildResult.rows[0] || null;
    }

    const guild: any = {
      id: result.rows[0].id,
      name: result.rows[0].name,
      icon_url: result.rows[0].icon_url,
      iconUrl: result.rows[0].icon_url,
      owner_id: result.rows[0].owner_id,
      ownerId: result.rows[0].owner_id,
      created_at: result.rows[0].created_at,
      createdAt: result.rows[0].created_at,
      guildBots: [],
    };

    const seenBotIds = new Set();
    for (const row of result.rows) {
      if (row.botId && !seenBotIds.has(row.botId)) {
        seenBotIds.add(row.botId);
        guild.guildBots.push({
          id: row.botId,
          botId: row.botId,
          isActive: row.isActive,
          addedAt: row.addedAt,
          bot: {
            id: row.botId,
            name: row.botName,
            slug: row.botSlug,
            colorAccent: row.botColorAccent,
            iconUrl: row.botIconUrl,
          },
        });
      }
    }

    return guild;
  }

  result = await db.query("SELECT * FROM guilds WHERE id = $1", [guildId]);
  return result.rows[0] || null;
}

export async function getGuildBot(guildId: string, botSlug: string) {
  const result = await db.query(
    "SELECT g.*, gb.bot_id as \"botId\", gb.is_active as \"isActive\", gb.added_at as \"addedAt\", b.name as \"botName\", b.slug as \"botSlug\", b.color_accent as \"botColorAccent\", b.icon_url as \"botIconUrl\" FROM guilds g JOIN guild_bots gb ON g.id = gb.guild_id JOIN bots b ON gb.bot_id = b.id WHERE g.id = $1 AND b.slug = $2",
    [guildId, botSlug]
  );
  return result.rows[0] || null;
}

export async function toggleGuildBot(guildId: string, botId: string) {
  const existing = await db.query(
    "SELECT * FROM guild_bots WHERE guild_id = $1 AND bot_id = $2",
    [guildId, botId]
  );

  if (existing.rows.length > 0) {
    const result = await db.query(
      "UPDATE guild_bots SET is_active = NOT is_active WHERE guild_id = $1 AND bot_id = $2 RETURNING *",
      [guildId, botId]
    );
    return result.rows[0];
  } else {
    const result = await db.query(
      "INSERT INTO guild_bots (id, guild_id, bot_id, is_active, added_at) VALUES (gen_random_uuid(), $1, $2, true, NOW()) RETURNING *",
      [guildId, botId]
    );
    return result.rows[0];
  }
}

export async function upsertGuild(guild: { id: string; name: string; icon?: string | null; ownerId: string }) {
  const iconUrl = guild.icon
    ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`
    : null;

  const result = await db.query(
    "INSERT INTO guilds (id, name, icon_url, owner_id) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO UPDATE SET name = $2, icon_url = $3 RETURNING *",
    [guild.id, guild.name, iconUrl, guild.ownerId]
  );
  return result.rows[0];
}

export async function createModerationLog(data: {
  guildId: string;
  action: string;
  targetUserId: string;
  moderatorId: string;
  reason?: string;
}) {
  const result = await db.query(
    "INSERT INTO moderation_logs (id, guild_id, action, target_user_id, moderator_id, reason, created_at) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW()) RETURNING *",
    [data.guildId, data.action, data.targetUserId, data.moderatorId, data.reason || null]
  );
  return result.rows[0];
}

export async function createGiveaway(data: {
  guildId: string;
  channelId: string;
  prize: string;
  winnersCount: number;
  endsAt: Date;
  createdBy: string;
}) {
  const result = await db.query(
    "INSERT INTO giveaways (id, guild_id, channel_id, prize, winners_count, ends_at, status, created_by, created_at) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, 'active', $6, NOW()) RETURNING *",
    [data.guildId, data.channelId, data.prize, data.winnersCount, data.endsAt, data.createdBy]
  );
  return result.rows[0];
}

export async function updateGiveaway(id: string, data: { status?: string }) {
  const updates: string[] = [];
  const params: any[] = [];
  if (data.status !== undefined) {
    params.push(data.status);
    updates.push(`status = $${params.length}`);
  }
  if (params.length === 0) return null;
  params.push(id);
  const result = await db.query(
    `UPDATE giveaways SET ${updates.join(", ")} WHERE id = $${params.length} RETURNING *`,
    params
  );
  return result.rows[0];
}

export async function upsertRouletteConfig(guildId: string, data: {
  minBet: number;
  maxBet: number;
  currencyName: string;
  enabled: boolean;
}) {
  const result = await db.query(
    "INSERT INTO roulette_configs (id, guild_id, min_bet, max_bet, currency_name, enabled) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5) ON CONFLICT (guild_id) DO UPDATE SET min_bet = $2, max_bet = $3, currency_name = $4, enabled = $5 RETURNING *",
    [guildId, data.minBet, data.maxBet, data.currencyName, data.enabled]
  );
  return result.rows[0];
}

export async function createTicket(data: {
  guildId: string;
  number: number;
  channelId: string;
  type?: string | null;
  openedBy: string;
}) {
  const result = await db.query(
    "INSERT INTO tickets (id, guild_id, number, channel_id, type, opened_by, status, transcript_content, created_at, claimed_at, closed_at) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, 'open', NULL, NOW(), NULL, NULL) RETURNING *",
    [data.guildId, data.number, data.channelId, data.type || null, data.openedBy]
  );
  return result.rows[0];
}

export async function getTicketCount(guildId: string) {
  const result = await db.query("SELECT COUNT(*) FROM tickets WHERE guild_id = $1", [guildId]);
  return parseInt(result.rows[0].count, 10);
}

export async function getRecentClosedTickets(limit: number = 10) {
  const result = await db.query(
    "SELECT t.*, g.name as \"guildName\", g.icon_url as \"guildIconUrl\" FROM tickets t JOIN guilds g ON t.guild_id = g.id WHERE t.status = 'closed' ORDER BY t.closed_at DESC LIMIT $1",
    [limit]
  );
  return result.rows;
}

export async function getAdminStats() {
  const [totalUsers, totalGuilds, totalTickets, openTickets, totalGiveaways] = await Promise.all([
    db.query("SELECT COUNT(*) FROM users"),
    db.query("SELECT COUNT(*) FROM guilds"),
    db.query("SELECT COUNT(*) FROM tickets"),
    db.query("SELECT COUNT(*) FROM tickets WHERE status = 'open'"),
    db.query("SELECT COUNT(*) FROM giveaways"),
  ]);

  const recentTickets = await getRecentClosedTickets(10);

  return {
    totalUsers: parseInt(totalUsers.rows[0].count, 10),
    totalGuilds: parseInt(totalGuilds.rows[0].count, 10),
    totalTickets: parseInt(totalTickets.rows[0].count, 10),
    openTickets: parseInt(openTickets.rows[0].count, 10),
    totalGiveaways: parseInt(totalGiveaways.rows[0].count, 10),
    recentTickets,
  };
}

export async function getTicketById(ticketId: string) {
  const result = await db.query(
    "SELECT t.*, g.name as \"guildName\", g.icon_url as \"guildIconUrl\" FROM tickets t JOIN guilds g ON t.guild_id = g.id WHERE t.id = $1",
    [ticketId]
  );
  return result.rows[0] || null;
}

export async function getTicketsByGuild(guildId: string, statusFilter?: string) {
  let query = "SELECT t.*, g.name as \"guildName\", g.icon_url as \"guildIconUrl\" FROM tickets t JOIN guilds g ON t.guild_id = g.id WHERE t.guild_id = $1";
  const params: any[] = [guildId];

  if (statusFilter && statusFilter !== "all") {
    params.push(statusFilter);
    query += ` AND t.status = $${params.length}`;
  }

  query += " ORDER BY t.created_at DESC";

  const result = await db.query(query, params);
  return result.rows;
}

// ─── Welcome Config ─────────────────────────────────────────────

export async function getWelcomeConfig(guildId: string) {
  const result = await db.query(
    'SELECT * FROM welcome_configs WHERE guild_id = $1',
    [guildId]
  );
  return result.rows[0] || null;
}

export async function upsertWelcomeConfig(guildId: string, data: {
  channelId?: string; roleId?: string; messageText?: string;
  embedColor?: string; showAvatar?: boolean; showBanner?: boolean;
}) {
  const result = await db.query(
    `INSERT INTO welcome_configs (id, guild_id, channel_id, role_id, message_text, embed_color, show_avatar, show_banner)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (guild_id) DO UPDATE SET
       channel_id = COALESCE($2, welcome_configs.channel_id),
       role_id = COALESCE($3, welcome_configs.role_id),
       message_text = COALESCE($4, welcome_configs.message_text),
       embed_color = COALESCE($5, welcome_configs.embed_color),
       show_avatar = COALESCE($6, welcome_configs.show_avatar),
       show_banner = COALESCE($7, welcome_configs.show_banner)
     RETURNING *`,
    [guildId, data.channelId || null, data.roleId || null, data.messageText || 'Welcome!', data.embedColor || '#3CFF4A', data.showAvatar ?? true, data.showBanner ?? true]
  );
  return result.rows[0];
}

// ─── Ticket Config ──────────────────────────────────────────────

export async function getTicketConfig(guildId: string) {
  const result = await db.query(
    'SELECT * FROM ticket_configs WHERE guild_id = $1',
    [guildId]
  );
  return result.rows[0] || null;
}

export async function upsertTicketConfig(guildId: string, data: {
  channelId?: string; categoryId?: string; logChannelId?: string;
}) {
  const result = await db.query(
    `INSERT INTO ticket_configs (id, guild_id, channel_id, category_id, log_channel_id)
     VALUES (gen_random_uuid(), $1, $2, $3, $4)
     ON CONFLICT (guild_id) DO UPDATE SET
       channel_id = COALESCE($2, ticket_configs.channel_id),
       category_id = COALESCE($3, ticket_configs.category_id),
       log_channel_id = COALESCE($4, ticket_configs.log_channel_id)
     RETURNING *`,
    [guildId, data.channelId || null, data.categoryId || null, data.logChannelId || null]
  );
  return result.rows[0];
}

// ─── Verification Config ────────────────────────────────────────

export async function getVerificationConfig(guildId: string) {
  const result = await db.query(
    'SELECT * FROM verification_configs WHERE guild_id = $1',
    [guildId]
  );
  return result.rows[0] || null;
}

export async function upsertVerificationConfig(guildId: string, data: {
  verifyChannelId?: string; unverifiedRoleId?: string; verifiedRoleId?: string;
  vpnCheckEnabled?: boolean; altCheckEnabled?: boolean;
}) {
  const result = await db.query(
    `INSERT INTO verification_configs (id, guild_id, verify_channel_id, unverified_role_id, verified_role_id, vpn_check_enabled, alt_check_enabled)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6)
     ON CONFLICT (guild_id) DO UPDATE SET
       verify_channel_id = COALESCE($2, verification_configs.verify_channel_id),
       unverified_role_id = COALESCE($3, verification_configs.unverified_role_id),
       verified_role_id = COALESCE($4, verification_configs.verified_role_id),
       vpn_check_enabled = COALESCE($5, verification_configs.vpn_check_enabled),
       alt_check_enabled = COALESCE($6, verification_configs.alt_check_enabled)
     RETURNING *`,
    [guildId, data.verifyChannelId || null, data.unverifiedRoleId || null, data.verifiedRoleId || null, data.vpnCheckEnabled ?? true, data.altCheckEnabled ?? true]
  );
  return result.rows[0];
}

// ─── Ticket Stats ───────────────────────────────────────────────

export async function getTicketStats(guildId: string) {
  const result = await db.query(
    `SELECT
       COUNT(*) as total,
       COUNT(*) FILTER (WHERE status = 'open') as open,
       COUNT(*) FILTER (WHERE status = 'closed') as closed
     FROM tickets WHERE guild_id = $1`,
    [guildId]
  );
  const row = result.rows[0] || {};
  return {
    total: parseInt(row.total || "0", 10),
    open: parseInt(row.open || "0", 10),
    closed: parseInt(row.closed || "0", 10),
  };
}

// ─── Guild Bots & Server Dashboard Helpers ───────────────────────

export async function getAllBotsForGuild(guildId: string) {
  const result = await db.query(
    `SELECT
       b.id,
       b.slug,
       b.name,
       b.tagline,
       b.description,
       b.features,
       b.client_id as "clientId",
       b.permissions,
       b.icon_url as "iconUrl",
       b.color_accent as "colorAccent",
       b.is_active as "isGlobalActive",
       gb.is_active as "isEnabledInGuild",
       gb.added_at as "addedAt",
       CASE WHEN gb.id IS NOT NULL THEN true ELSE false END as "isLinked"
     FROM bots b
     LEFT JOIN guild_bots gb ON b.id = gb.bot_id AND gb.guild_id = $1
     ORDER BY b.created_at ASC`,
    [guildId]
  );
  return result.rows;
}

export async function getGuildOverviewStats(guildId: string) {
  const [botsResult, ticketsResult, giveawaysResult, logsResult] = await Promise.all([
    db.query("SELECT COUNT(*) FROM guild_bots WHERE guild_id = $1 AND is_active = true", [guildId]),
    db.query(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = 'open') as open FROM tickets WHERE guild_id = $1`, [guildId]),
    db.query("SELECT COUNT(*) FROM giveaways WHERE guild_id = $1 AND status = 'active'", [guildId]),
    db.query("SELECT COUNT(*) FROM moderation_logs WHERE guild_id = $1", [guildId]),
  ]);

  return {
    activeBots: parseInt(botsResult.rows[0]?.count || "0", 10),
    totalTickets: parseInt(ticketsResult.rows[0]?.total || "0", 10),
    openTickets: parseInt(ticketsResult.rows[0]?.open || "0", 10),
    activeGiveaways: parseInt(giveawaysResult.rows[0]?.count || "0", 10),
    modLogsCount: parseInt(logsResult.rows[0]?.count || "0", 10),
  };
}

export async function getPulseConfig(guildId: string) {
  const result = await db.query("SELECT * FROM pulse_configs WHERE guild_id = $1", [guildId]);
  return result.rows[0] || { guild_id: guildId, enabled: true };
}

export async function getAscendConfig(guildId: string) {
  const result = await db.query("SELECT * FROM ascend_configs WHERE guild_id = $1", [guildId]);
  return result.rows[0] || { guild_id: guildId, enabled: true, xp_cooldown_seconds: 60, xp_per_message_min: 15, xp_per_message_max: 25 };
}

export async function upsertPulseConfig(guildId: string, enabled: boolean) {
  const result = await db.query(
    "INSERT INTO pulse_configs (id, guild_id, enabled) VALUES (gen_random_uuid(), $1, $2) ON CONFLICT (guild_id) DO UPDATE SET enabled = $2 RETURNING *",
    [guildId, enabled]
  );
  return result.rows[0];
}

export async function upsertAscendConfig(guildId: string, data: { enabled: boolean; xpCooldownSeconds: number; xpPerMessageMin: number; xpPerMessageMax: number }) {
  const result = await db.query(
    `INSERT INTO ascend_configs (id, guild_id, enabled, xp_cooldown_seconds, xp_per_message_min, xp_per_message_max)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)
     ON CONFLICT (guild_id) DO UPDATE SET enabled = $2, xp_cooldown_seconds = $3, xp_per_message_min = $4, xp_per_message_max = $5
     RETURNING *`,
    [guildId, data.enabled, data.xpCooldownSeconds, data.xpPerMessageMin, data.xpPerMessageMax]
  );
  return result.rows[0];
}

export async function getBeaconFeeds(guildId: string) {
  const result = await db.query("SELECT id, platform, source_ref as \"sourceRef\", target_channel_id as \"targetChannelId\", enabled FROM feeds WHERE guild_id = $1 ORDER BY created_at DESC", [guildId]);
  return result.rows;
}

export async function createBeaconFeed(guildId: string, data: { platform: string; sourceRef: string; targetChannelId: string }) {
  const webhookSecret = data.platform === "webhook" ? randomBytes(32).toString("hex") : null;
  const result = await db.query(
    "INSERT INTO feeds (id, guild_id, platform, source_ref, target_channel_id, embed_template, webhook_secret, enabled, created_at) VALUES (gen_random_uuid(), $1, $2, $3, $4, '{}', $5, true, NOW()) RETURNING id, platform, source_ref as \"sourceRef\", target_channel_id as \"targetChannelId\", enabled, webhook_secret as \"webhookSecret\"",
    [guildId, data.platform, data.sourceRef, data.targetChannelId, webhookSecret]
  );
  const feed = result.rows[0];
  if (webhookSecret) {
    feed.webhookUrl = `${process.env.BEACON_PUBLIC_URL || ""}/webhooks/beacon/${feed.id}/${webhookSecret}`;
  }
  return feed;
}

export async function setBeaconFeedEnabled(guildId: string, feedId: string, enabled: boolean) {
  const result = await db.query("UPDATE feeds SET enabled = $1 WHERE id = $2 AND guild_id = $3 RETURNING id, enabled", [enabled, feedId, guildId]);
  return result.rows[0] || null;
}

// ─── Giveaway Helpers ───────────────────────────────────────────

export async function getGiveawaysByGuild(guildId: string) {
  const result = await db.query(
    `SELECT * FROM giveaways WHERE guild_id = $1 ORDER BY created_at DESC`,
    [guildId]
  );
  return result.rows;
}

export async function endGiveaway(giveawayId: string, guildId: string) {
  const result = await db.query(
    `UPDATE giveaways SET status = 'ended' WHERE id = $1 AND guild_id = $2 RETURNING *`,
    [giveawayId, guildId]
  );
  return result.rows[0] || null;
}

// ─── Roulette Config Helpers ────────────────────────────────────

export async function getRouletteConfig(guildId: string) {
  const result = await db.query(
    `SELECT * FROM roulette_configs WHERE guild_id = $1`,
    [guildId]
  );
  return result.rows[0] || null;
}

// ─── Moderation Logs Helpers ────────────────────────────────────

export async function getModerationLogsByGuild(guildId: string, actionFilter?: string) {
  let query = `SELECT * FROM moderation_logs WHERE guild_id = $1`;
  const params: any[] = [guildId];

  if (actionFilter && actionFilter !== "all") {
    params.push(actionFilter);
    query += ` AND action = $${params.length}`;
  }

  query += ` ORDER BY created_at DESC LIMIT 50`;
  const result = await db.query(query, params);
  return result.rows;
}

// ─── Super Admin Control Panel Helpers ──────────────────────────

export async function getAllGuildsForAdmin() {
  const result = await db.query(
    `SELECT
       g.id,
       g.name,
       g.icon_url as "iconUrl",
       g.owner_id as "ownerId",
       COUNT(DISTINCT gb.id) FILTER (WHERE gb.is_active = true) as "activeBotsCount",
       COUNT(DISTINCT t.id) as "ticketsCount",
       COALESCE(json_agg(json_build_object(
         'botId', gb.bot_id,
         'botName', b.name,
         'isAdminBlocked', gb.is_admin_blocked,
         'adminBlockReason', gb.admin_block_reason
       ) ORDER BY b.name) FILTER (WHERE gb.bot_id IS NOT NULL), '[]') as bots
     FROM guilds g
     LEFT JOIN guild_bots gb ON g.id = gb.guild_id
     LEFT JOIN bots b ON b.id = gb.bot_id
     LEFT JOIN tickets t ON g.id = t.guild_id
     GROUP BY g.id, g.name, g.icon_url, g.owner_id
     ORDER BY g.name ASC`
  );
  return result.rows;
}

export async function getAllBotsForAdmin() {
  const result = await db.query(
    `SELECT
       b.id,
       b.slug,
       b.name,
       b.tagline,
       b.description,
       b.features,
       b.client_id as "clientId",
       b.permissions,
       b.icon_url as "iconUrl",
       b.color_accent as "colorAccent",
       b.is_active as "isActive",
       b.created_at as "createdAt",
       COUNT(DISTINCT gb.guild_id) FILTER (WHERE gb.is_active = true) as "serverCount"
     FROM bots b
     LEFT JOIN guild_bots gb ON b.id = gb.bot_id
     GROUP BY b.id
     ORDER BY b.created_at ASC`
  );
  return result.rows;
}

export async function createBotForAdmin(data: {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  features: string;
  clientId: string;
  permissions?: string;
  colorAccent?: string;
  iconUrl?: string;
}) {
  const result = await db.query(
    `INSERT INTO bots (id, slug, name, tagline, description, features, client_id, permissions, color_accent, icon_url, is_active, created_at)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, true, NOW())
     RETURNING *`,
    [
      data.slug,
      data.name,
      data.tagline,
      data.description,
      data.features || "[]",
      data.clientId,
      data.permissions || "8",
      data.colorAccent || "#F2A93B",
      data.iconUrl || null,
    ]
  );
  return result.rows[0];
}

export async function deleteBotForAdmin(botId: string) {
  await db.query("DELETE FROM guild_bots WHERE bot_id = $1", [botId]);
  const result = await db.query("DELETE FROM bots WHERE id = $1 RETURNING *", [botId]);
  return result.rows[0] || null;
}

export async function toggleBotGlobalStatus(botId: string) {
  const result = await db.query(
    `UPDATE bots SET is_active = NOT is_active WHERE id = $1 RETURNING *`,
    [botId]
  );
  return result.rows[0] || null;
}

export async function getAllUsersForAdmin() {
  const result = await db.query(
    `SELECT id, username, avatar, is_admin as "isAdmin",
            is_banned as "isBanned", banned_at as "bannedAt",
            ban_reason as "banReason", created_at as "createdAt"
     FROM users ORDER BY created_at DESC`
  );
  return result.rows;
}

export async function setUserBanForAdmin(
  userId: string,
  banned: boolean,
  reason: string | null,
  adminUserId: string
) {
  if (userId === adminUserId && banned) {
    throw new Error("You cannot ban your own admin account");
  }

  const result = await db.query(
    `UPDATE users
     SET is_banned = $2,
         banned_at = CASE WHEN $2 THEN NOW() ELSE NULL END,
         ban_reason = CASE WHEN $2 THEN $3 ELSE NULL END
     WHERE id = $1
     RETURNING id, username, is_banned as "isBanned", banned_at as "bannedAt", ban_reason as "banReason"`,
    [userId, banned, reason]
  );
  const user = result.rows[0];
  if (!user) return null;

  await db.query(
    `INSERT INTO admin_audit_logs
      (id, admin_user_id, action, target_type, target_id, reason, metadata)
     VALUES (gen_random_uuid(), $1, $2, 'user', $3, $4, NULL)`,
    [adminUserId, banned ? "ban_user" : "unban_user", userId, reason]
  );
  return user;
}

export async function setGuildBotAdminBlock(
  guildId: string,
  botId: string,
  blocked: boolean,
  reason: string | null,
  adminUserId: string
) {
  const result = await db.query(
    `UPDATE guild_bots
     SET is_admin_blocked = $3,
         admin_blocked_at = CASE WHEN $3 THEN NOW() ELSE NULL END,
         admin_block_reason = CASE WHEN $3 THEN $4 ELSE NULL END,
         is_active = CASE WHEN $3 THEN false ELSE is_active END
     WHERE guild_id = $1 AND bot_id = $2
     RETURNING guild_id as "guildId", bot_id as "botId", is_admin_blocked as "isAdminBlocked"`,
    [guildId, botId, blocked, reason]
  );
  const guildBot = result.rows[0];
  if (!guildBot) return null;

  await db.query(
    `INSERT INTO admin_audit_logs
      (id, admin_user_id, action, target_type, target_id, reason, metadata)
     VALUES (gen_random_uuid(), $1, $2, 'guild_bot', $3, $4, $5)`,
    [adminUserId, blocked ? "block_guild_bot" : "unblock_guild_bot", botId, reason, JSON.stringify({ guildId })]
  );
  return guildBot;
}

export async function getAdminAuditLogs(limit = 100) {
  const result = await db.query(
    `SELECT id, admin_user_id as "adminUserId", action,
            target_type as "targetType", target_id as "targetId",
            reason, metadata, created_at as "createdAt"
     FROM admin_audit_logs ORDER BY created_at DESC LIMIT $1`,
    [limit]
  );
  return result.rows;
}

export async function updateBotDetails(botId: string, data: {
  name?: string;
  tagline?: string;
  description?: string;
  features?: string;
  clientId?: string;
  permissions?: string;
  colorAccent?: string;
}) {
  const updates: string[] = [];
  const params: any[] = [];

  if (data.name !== undefined) {
    params.push(data.name);
    updates.push(`name = $${params.length}`);
  }
  if (data.tagline !== undefined) {
    params.push(data.tagline);
    updates.push(`tagline = $${params.length}`);
  }
  if (data.description !== undefined) {
    params.push(data.description);
    updates.push(`description = $${params.length}`);
  }
  if (data.features !== undefined) {
    params.push(data.features);
    updates.push(`features = $${params.length}`);
  }
  if (data.clientId !== undefined) {
    params.push(data.clientId);
    updates.push(`client_id = $${params.length}`);
  }
  if (data.permissions !== undefined) {
    params.push(data.permissions);
    updates.push(`permissions = $${params.length}`);
  }
  if (data.colorAccent !== undefined) {
    params.push(data.colorAccent);
    updates.push(`color_accent = $${params.length}`);
  }

  if (updates.length === 0) return null;
  params.push(botId);

  const result = await db.query(
    `UPDATE bots SET ${updates.join(", ")} WHERE id = $${params.length} RETURNING *`,
    params
  );
  return result.rows[0] || null;
}

export async function getAllGlobalTickets(limit = 20, status?: string) {
  let query = `
    SELECT
      t.*,
      g.name as "guildName",
      g.icon_url as "guildIconUrl"
    FROM tickets t
    JOIN guilds g ON t.guild_id = g.id
  `;
  const params: any[] = [];

  if (status && status !== "all") {
    params.push(status);
    query += ` WHERE t.status = $${params.length}`;
  }

  params.push(limit);
  query += ` ORDER BY t.created_at DESC LIMIT $${params.length}`;

  const result = await db.query(query, params);
  return result.rows;
}


