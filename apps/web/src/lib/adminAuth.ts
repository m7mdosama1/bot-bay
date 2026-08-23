import { db } from "@/lib/prisma";
import { verifyTotpToken } from "@/lib/totp";

interface AdminSession {
  authenticated: boolean;
  userId?: string;
  isAdmin?: boolean;
}

const adminSessions = new Map<string, { userId: string; secret: string; createdAt: number }>();

const ADMIN_SESSION_DURATION = 8 * 60 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000;

const failedAttempts = new Map<string, { count: number; lastAttempt: number }>();

function getAdminAllowlist(): string[] {
  const allowlist = process.env.ADMIN_ALLOWLIST?.split(",") || [];
  return allowlist.map((id) => id.trim()).filter(Boolean);
}

const ADMIN_ALLOWLIST: string[] = [];

export async function verifyAdminSession(userId?: string, accessToken?: string): Promise<AdminSession> {
  if (!userId) {
    return { authenticated: false };
  }

  const session = adminSessions.get(userId);
  if (!session) {
    return { authenticated: false };
  }

  const now = Date.now();
  if (now - session.createdAt > ADMIN_SESSION_DURATION) {
    adminSessions.delete(userId);
    return { authenticated: false };
  }

  if (!getAdminAllowlist().includes(userId)) {
    return { authenticated: false };
  }

  try {
    const result = await db.query(
      "SELECT is_admin as \"isAdmin\" FROM users WHERE id = $1",
      [userId]
    );
    const dbUser = result.rows[0];

    if (!dbUser?.isAdmin) {
      return { authenticated: false };
    }
  } catch (error) {
    console.error("Failed to verify admin user:", error);
    return { authenticated: false };
  }

  return { authenticated: true, userId, isAdmin: true };
}

export function isAdminAllowlisted(userId: string): boolean {
  return getAdminAllowlist().includes(userId);
}

export function checkFailedAttempts(userId: string): { locked: boolean; remaining: number } {
  const attempts = failedAttempts.get(userId);
  if (!attempts) {
    return { locked: false, remaining: MAX_FAILED_ATTEMPTS };
  }

  const now = Date.now();
  if (now - attempts.lastAttempt > LOCKOUT_DURATION) {
    failedAttempts.delete(userId);
    return { locked: false, remaining: MAX_FAILED_ATTEMPTS };
  }

  if (attempts.count >= MAX_FAILED_ATTEMPTS) {
    return { locked: true, remaining: 0 };
  }

  return { locked: false, remaining: MAX_FAILED_ATTEMPTS - attempts.count };
}

export function recordFailedAttempt(userId: string) {
  const attempts = failedAttempts.get(userId);
  if (attempts) {
    failedAttempts.set(userId, {
      count: attempts.count + 1,
      lastAttempt: Date.now(),
    });
  } else {
    failedAttempts.set(userId, { count: 1, lastAttempt: Date.now() });
  }
}

export function verifyTotpAndCreateSession(userId: string, token: string): { success: boolean; error?: string } {
  const rateLimit = checkFailedAttempts(userId);
  if (rateLimit.locked) {
    return { success: false, error: "Too many failed attempts. Try again later." };
  }

  const secret = process.env.TOTP_SECRET;
  if (!secret) {
    return { success: false, error: "TOTP not configured" };
  }

  const isValid = verifyTotpToken(token, process.env.TOTP_SECRET!);
  if (!isValid) {
    recordFailedAttempt(userId);
    const remaining = checkFailedAttempts(userId);
    return {
      success: false,
      error: `Invalid code. ${remaining.remaining} attempts remaining.`,
    };
  }

  failedAttempts.delete(userId);

  adminSessions.set(userId, {
    userId,
    secret,
    createdAt: Date.now(),
  });

  return { success: true };
}

export async function getAdminStats() {
  const [totalUsers, totalGuilds, totalTickets, openTickets, totalGiveaways] = await Promise.all([
    db.query("SELECT COUNT(*) FROM users"),
    db.query("SELECT COUNT(*) FROM guilds"),
    db.query("SELECT COUNT(*) FROM tickets"),
    db.query("SELECT COUNT(*) FROM tickets WHERE status = 'open'"),
    db.query("SELECT COUNT(*) FROM giveaways"),
  ]);

  const recentTicketsResult = await db.query(
    "SELECT t.*, g.name as \"guildName\", g.icon_url as \"guildIconUrl\" FROM tickets t JOIN guilds g ON t.guild_id = g.id WHERE t.status = 'closed' ORDER BY t.closed_at DESC LIMIT 10"
  );

  return {
    totalUsers: parseInt(totalUsers.rows[0].count, 10),
    totalGuilds: parseInt(totalGuilds.rows[0].count, 10),
    totalTickets: parseInt(totalTickets.rows[0].count, 10),
    openTickets: parseInt(openTickets.rows[0].count, 10),
    totalGiveaways: parseInt(totalGiveaways.rows[0].count, 10),
    recentTickets: recentTicketsResult.rows,
  };
}
