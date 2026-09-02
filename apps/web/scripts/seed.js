require("dotenv/config");
const { Pool } = require("pg");

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL is not set");
  process.exit(0);
}

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes("localhost") ? false : { rejectUnauthorized: false },
  max: 1,
});

const bots = [
  {
    slug: "verification",
    name: "Sentinel Verify",
    tagline: "Anti-alt & VPN verification system",
    description: "Protect your server from alt accounts and VPN users with advanced verification including account age checks, IP reputation, and device fingerprinting.",
    features: JSON.stringify([
      "Discord OAuth verification flow",
      "Anti-VPN/Proxy detection (IPQualityScore & ProxyCheck.io)",
      "Alt account detection via account age",
      "Device fingerprint matching",
      "Role assignment on success",
      "IP hashing with 30-day auto-cleanup"
    ]),
    clientId: process.env.BOT_VERIFICATION_CLIENT_ID || "123456789012345678",
    permissions: "268468292673",
    colorAccent: "#3CFF4A",
    iconUrl: "/bots/verification.png",
  },
  {
    slug: "giveaway",
    name: "Bounty Drop",
    tagline: "Automated giveaways with real-time countdown",
    description: "Run engaging giveaways with live countdown embeds, automatic winner selection, and anti-entry spam protection.",
    features: JSON.stringify([
      "Slash commands for create/end/reroll",
      "Real-time countdown embed",
      "Anti-spam entry protection",
      "Automatic winner selection",
      "30-second poll interval"
    ]),
    clientId: process.env.BOT_GIVEAWAY_CLIENT_ID || "123456789012345680",
    permissions: "8",
    colorAccent: "#FFA500",
    iconUrl: "/bots/giveaway.png",
  },
  {
    slug: "roulette",
    name: "Fortune Wheel",
    tagline: "Interactive roulette with betting system",
    description: "A fully button-based roulette game with configurable bets, currency, probabilities, daily bonuses, and detailed history tracking.",
    features: JSON.stringify([
      "Fully button-based UI (no slash commands for users)",
      "Multi-select color + number betting",
      "Modal-based bet amount entry",
      "Configurable min/max bets and currency",
      "Daily bonus system",
      "Detailed history tracking"
    ]),
    clientId: process.env.BOT_ROULETTE_CLIENT_ID || "123456789012345682",
    permissions: "8",
    colorAccent: "#9D4EDD",
    iconUrl: "/bots/roulette.png",
  },
  {
    slug: "admin",
    name: "Iron Gavel",
    tagline: "Moderation toolkit with logging",
    description: "Comprehensive moderation bot with ban, kick, mute, warn commands, confirmation flows, and permanent moderation logs.",
    features: JSON.stringify([
      "Ban, kick, mute, warn commands",
      "Confirm/Cancel confirmation flow",
      "Ephemeral confirmation messages",
      "Moderation log database persistence",
      "Optional auto-moderation"
    ]),
    clientId: process.env.BOT_ADMIN_CLIENT_ID || "123456789012345684",
    permissions: "8",
    colorAccent: "#3B82F6",
    iconUrl: "/bots/admin.png",
  },
  {
    slug: "welcome",
    name: "Threshold",
    tagline: "Welcome channels with rule acceptance",
    description: "Creates a private welcome channel for each new member with customizable rules and an agreement button.",
    features: JSON.stringify([
      "Private welcome channel per member",
      "Customizable welcome message",
      "Rule agreement button",
      "Auto role assignment",
      "Channel cleanup after timeout"
    ]),
    clientId: process.env.BOT_WELCOME_CLIENT_ID || "123456789012345686",
    permissions: "8",
    colorAccent: "#06D6A0",
    iconUrl: "/bots/welcome.png",
  },
  {
    slug: "ticket",
    name: "Deskline",
    tagline: "Persistent ticket system with transcripts",
    description: "Full ticket system with claim/close buttons, permanent transcript archiving in the database.",
    features: JSON.stringify([
      "One-click ticket opening",
      "Claim and Close buttons (always visible)",
      "Permanent transcript storage in database",
      "Log channel file export",
      "Channel deletion after close",
      "Dashboard ticket archive"
    ]),
    clientId: process.env.BOT_TICKET_CLIENT_ID || "123456789012345688",
    permissions: "8",
    colorAccent: "#F2A93B",
    iconUrl: "/bots/ticket.png",
  },
    {
      slug: "beacon",
      name: "Beacon",
      tagline: "Signal every important update",
      description: "Official-source notifications for Twitch, Kick, YouTube, GitHub, Reddit, and RSS with rich, configurable embeds.",
      features: JSON.stringify(["RSS and API feeds", "Twitch and Kick live alerts", "Duplicate protection", "Custom embed templates"]),
      clientId: process.env.BOT_BEACON_CLIENT_ID || "123456789012345690",
      permissions: "19456",
      colorAccent: "#DCA85D",
      iconUrl: "/bots/beacon.png",
    },
    {
      slug: "pulse",
      name: "Pulse",
      tagline: "See how your community moves",
      description: "Privacy-aware server analytics for messages, member growth, active users, channels, and voice activity.",
      features: JSON.stringify(["Message activity", "Member growth", "Active users", "Voice analytics"]),
      clientId: process.env.BOT_PULSE_CLIENT_ID || "123456789012345692",
      permissions: "16896",
      colorAccent: "#58C8A5",
      iconUrl: "/bots/pulse.png",
    },
    {
      slug: "ascend",
      name: "Ascend",
      tagline: "Turn participation into momentum",
      description: "A persistent XP and level system with streaks, role rewards, leaderboards, and private rank experiences.",
      features: JSON.stringify(["Cooldown XP", "Level roles", "Daily streaks", "Leaderboards"]),
      clientId: process.env.BOT_ASCEND_CLIENT_ID || "123456789012345694",
      permissions: "26816",
      colorAccent: "#D97968",
      iconUrl: "/bots/ascend.png",
    },
];

async function seed() {
  try {
    const result = await pool.query("SELECT COUNT(*) FROM bots");
    const count = parseInt(result.rows[0].count, 10);
    console.log(`Currently ${count} bots in DB. Forcing a re-seed...`);

    for (const bot of bots) {
      await pool.query(
        `INSERT INTO bots (id, slug, name, tagline, description, features, client_id, permissions, icon_url, color_accent, is_active, created_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, true, NOW())
         ON CONFLICT (slug) DO UPDATE SET
           name = $2, tagline = $3, description = $4, features = $5, client_id = $6, permissions = $7, icon_url = $8, color_accent = $9, is_active = true`,
        [
          bot.slug,
          bot.name,
          bot.tagline,
          bot.description,
          bot.features,
          bot.clientId,
          bot.permissions,
          bot.iconUrl,
          bot.colorAccent,
        ]
      );
    }

    console.log(`Seeded ${bots.length} bots`);
  } catch (error) {
    console.error("Seed failed:", error);
  } finally {
    await pool.end();
  }
}

seed();
