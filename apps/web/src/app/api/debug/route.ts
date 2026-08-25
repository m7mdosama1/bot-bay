import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";

export async function GET() {
  try {
    const botsResult = await db.query("SELECT COUNT(*) FROM bots");
    const usersResult = await db.query("SELECT id, username, is_admin FROM users");

    return NextResponse.json({
      bots: parseInt(botsResult.rows[0].count, 10),
      users: usersResult.rows,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
