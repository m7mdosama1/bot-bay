import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { deleteKickConnection, getGuildById } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const guildId = request.nextUrl.searchParams.get("guildId") || "";
  const guild = guildId ? await getGuildById(guildId) : null;
  if (!session?.user?.id || !guild || guild.owner_id !== session.user.id) {
    return NextResponse.json({ error: "Only the server owner can disconnect Kick" }, { status: 403 });
  }
  await deleteKickConnection(guildId, session.user.id);
  return NextResponse.json({ success: true });
}