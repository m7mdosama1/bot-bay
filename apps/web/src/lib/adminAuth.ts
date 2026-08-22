import { prisma } from "@/lib/prisma";
import { verifyTotpToken } from "@/lib/totp";

interface AdminSession {
  authenticated: boolean;
  userId?: string;
  isAdmin?: boolean;
}

// In-memory store for admin sessions (in production, use Redis or encrypted DB sessions)
const adminSessions = new Map<string, { userId: string; secret: string; createdAt: number }>();

const ADMIN_SESSION_DURATION = 8 * 60 * 60 * 1000; // 8 hours
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

const failedAttempts = new Map<string, { count: number; lastAttempt: number }>();

const ADMIN_ALLOWLIST = process.env.ADMIN_ALLOWLIST?.split(",") || [];

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

  // Verify user is still in the allowlist
  if (!ADMIN_ALLOWLIST.includes(userId)) {
    return { authenticated: false };
  }

  // Verify against database
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!dbUser?.isAdmin) {
    return { authenticated: false };
  }

  return { authenticated: true, userId, isAdmin: true };
}

export function isAdminAllowlisted(userId: string): boolean {
  return ADMIN_ALLOWLIST.includes(userId);
}

export function checkFailedAttempts(userId: string): { locked: boolean; remaining: number } {
  const attempts = failedAttempts.get(userId);
  if (!attempts) {
    return { locked: false, remaining: MAX_FAILED_ATTEMPTS };
  }

  const now = Date.now();
  if (now - attempts.lastAttempt > LOCKOUT_DURATION) {
    // Reset after lockout period
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

  // Clear failed attempts on success
  failedAttempts.delete(userId);

  // Create admin session
  adminSessions.set(userId, {
    userId,
    secret,
    createdAt: Date.now(),
  });

  return { success: true };
}

export async function getAdminStats() {
  const [totalUsers, totalGuilds, totalTickets, openTickets, totalGiveaways] = await Promise.all([
    prisma.user.count(),
    prisma.guild.count(),
    prisma.ticket.count(),
    prisma.ticket.count({ where: { status: "open" } }),
    prisma.giveaway.count(),
  ]);

  const recentTickets = await prisma.ticket.findMany({
    where: { status: "closed" },
    include: { guild: true },
    orderBy: { closedAt: "desc" },
    take: 10,
  });

  return {
    totalUsers,
    totalGuilds,
    totalTickets,
    openTickets,
    totalGiveaways,
    recentTickets,
  };
}
