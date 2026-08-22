import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { fetchUserGuilds } from "@/lib/discordApi";
import { toggleGuildBot } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getServerSession();

  if (!session || !session.user || !session.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const accessToken = session.accessToken as string;
    const guilds = await fetchUserGuilds(accessToken);

    return NextResponse.json({ guilds });
  } catch (error) {
    console.error("Error fetching guilds:", error);
    return NextResponse.json({ error: "Failed to fetch guilds" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession();

  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { guildId, botId } = body;

    await toggleGuildBot(guildId, botId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error toggling guild bot:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
