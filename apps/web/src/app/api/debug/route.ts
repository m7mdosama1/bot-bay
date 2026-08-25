import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";

export async function GET() {
  try {
    const botsResult = await db.query("SELECT COUNT(*) FROM bots");
    const usersResult = await db.query("SELECT id, username, is_admin FROM users");

    return NextResponse.json({
      bots: parseInt(botsResult.rows[0].count, 10),
      users: usersResult.rows,
      env: {
        NEXTAUTH_URL: process.env.NEXTAUTH_URL || "NOT SET",
        ADMIN_ALLOWLIST: process.env.ADMIN_ALLOWLIST || "NOT SET",
        ADMIN_SECRET_PATH: process.env.ADMIN_SECRET_PATH || "NOT SET",
        hasDiscordClientId: !!process.env.DISCORD_CLIENT_ID,
        hasDiscordClientSecret: !!process.env.DISCORD_CLIENT_SECRET,
        hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
        hasDatabaseUrl: !!process.env.DATABASE_URL,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
