import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getGiveawaysByGuild, createGiveaway } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { guildId } = await params;
  try {
    const giveaways = await getGiveawaysByGuild(guildId);
    return NextResponse.json({ success: true, giveaways });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

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
    const body = await req.json();
    const { prize, channelId, winnersCount, durationMinutes } = body;

    if (!prize || !channelId) {
      return NextResponse.json(
        { error: "Prize and Channel ID are required" },
        { status: 400 }
      );
    }

    const duration = parseInt(durationMinutes || "60", 10);
    const endsAt = new Date(Date.now() + duration * 60 * 1000);

    const giveaway = await createGiveaway({
      guildId,
      channelId,
      prize,
      winnersCount: parseInt(winnersCount || "1", 10),
      endsAt,
      createdBy: session.user.id || "Dashboard",
    });

    return NextResponse.json({ success: true, giveaway });
  } catch (error: any) {
    console.error("Failed to create giveaway:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create giveaway" },
      { status: 500 }
    );
  }
}

