import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { toggleGuildBot } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { guildId } = await params;
  try {
    const { botId } = await req.json();
    if (!botId) {
      return NextResponse.json({ error: "Bot ID is required" }, { status: 400 });
    }

    const result = await toggleGuildBot(guildId, botId);
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("Failed to toggle guild bot:", error);
    return NextResponse.json(
      { error: error.message || "Failed to toggle bot" },
      { status: 500 }
    );
  }
}
