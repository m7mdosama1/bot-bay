import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  upsertWelcomeConfig,
  upsertTicketConfig,
  upsertVerificationConfig,
  upsertRouletteConfig,
  getGuildById,
  upsertPulseConfig,
  upsertAscendConfig,
} from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;
  const session = await getServerSession(authOptions);
  const guild = await getGuildById(guildId);
  if (!session?.user?.id || !guild || guild.owner_id !== session.user.id) {
    return NextResponse.json({ error: "Only the server owner can change bot settings" }, { status: 403 });
  }
  const body = await req.json();
  const { botSlug, ...data } = body;

  try {
    let result;
    switch (botSlug) {
      case "welcome":
        result = await upsertWelcomeConfig(guildId, data);
        break;
      case "ticket":
        result = await upsertTicketConfig(guildId, data);
        break;
      case "verification":
        result = await upsertVerificationConfig(guildId, data);
        break;
      case "roulette":
        result = await upsertRouletteConfig(guildId, {
          minBet: data.minBet || 10,
          maxBet: data.maxBet || 10000,
          currencyName: data.currencyName || "Coins",
          enabled: data.enabled !== false,
        });
        break;
      case "pulse":
        result = await upsertPulseConfig(guildId, data.enabled !== false);
        break;
      case "ascend":
        result = await upsertAscendConfig(guildId, {
          enabled: data.enabled !== false,
          xpCooldownSeconds: Math.max(10, Number(data.xpCooldownSeconds) || 60),
          xpPerMessageMin: Math.max(1, Number(data.xpPerMessageMin) || 15),
          xpPerMessageMax: Math.max(Number(data.xpPerMessageMin) || 15, Number(data.xpPerMessageMax) || 25),
        });
        break;
      default:
        return NextResponse.json(
          { error: "Unknown bot slug" },
          { status: 400 }
        );
    }
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error(`Failed to save ${botSlug} config:`, error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
