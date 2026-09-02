import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { verifyAdminSession } from "@/lib/adminAuth";
import { setGuildBotAdminBlock, setUserBanForAdmin } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const adminSession = await verifyAdminSession(
    session?.user?.id,
    session?.accessToken as string
  );

  if (!adminSession.authenticated || !adminSession.userId) {
    return NextResponse.json({ error: "Unauthorized Admin" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const reason = typeof body.reason === "string" && body.reason.trim()
      ? body.reason.trim()
      : null;

    if (body.action === "ban-user" || body.action === "unban-user") {
      const userId = typeof body.userId === "string" ? body.userId.trim() : "";
      if (!userId) return NextResponse.json({ error: "User ID is required" }, { status: 400 });

      const user = await setUserBanForAdmin(
        userId,
        body.action === "ban-user",
        reason,
        adminSession.userId
      );
      if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
      return NextResponse.json({ success: true, user });
    }

    if (body.action === "block-guild-bot" || body.action === "unblock-guild-bot") {
      const guildId = typeof body.guildId === "string" ? body.guildId.trim() : "";
      const botId = typeof body.botId === "string" ? body.botId.trim() : "";
      if (!guildId || !botId) {
        return NextResponse.json({ error: "Guild ID and bot ID are required" }, { status: 400 });
      }

      const guildBot = await setGuildBotAdminBlock(
        guildId,
        botId,
        body.action === "block-guild-bot",
        reason,
        adminSession.userId
      );
      if (!guildBot) return NextResponse.json({ error: "Bot is not connected to this guild" }, { status: 404 });
      return NextResponse.json({ success: true, guildBot });
    }

    return NextResponse.json({ error: "Invalid admin action" }, { status: 400 });
  } catch (error: unknown) {
    console.error("Admin control error:", error);
    const message = error instanceof Error ? error.message : "Admin control failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}