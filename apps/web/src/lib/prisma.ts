import { Pool } from "pg";

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
      max: 20,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 15000,
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
