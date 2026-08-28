import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  createModerationLog,
  createGiveaway,
  updateGiveaway,
  upsertRouletteConfig,
  createTicket,
  getTicketCount,
} from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action, guildId, ...data } = body;

    if (action === "create_giveaway") {
      const { prize, winnersCount, endsAt } = data;
      const giveaway = await createGiveaway({
        guildId,
        channelId: data.channelId,
        prize,
        winnersCount: Number(winnersCount),
        endsAt: new Date(endsAt),
        createdBy: session.user.id,
      });
      return NextResponse.json({ success: true, giveaway });
    }

    if (action === "cancel_giveaway") {
      const { giveawayId } = data;
      await updateGiveaway(giveawayId, { status: "cancelled" });
      return NextResponse.json({ success: true });
    }

    if (action === "log_moderation") {
      const { action: modAction, targetUserId, reason } = data;
      await createModerationLog({
        guildId,
        action: modAction,
        targetUserId,
        moderatorId: session.user.id,
        reason,
      });
      return NextResponse.json({ success: true });
    }

    if (action === "set_roulette_config") {
      const { minBet, maxBet, currencyName, enabled } = data;
      await upsertRouletteConfig(guildId, {
        minBet: Number(minBet),
        maxBet: Number(maxBet),
        currencyName,
        enabled: Boolean(enabled),
      });
      return NextResponse.json({ success: true });
    }

    if (action === "log_ticket") {
      const { channelId, type, openedBy } = data;
      const ticketCount = await getTicketCount(guildId);
      const ticket = await createTicket({
        guildId,
        number: ticketCount + 1,
        channelId,
        type,
        openedBy,
      });
      return NextResponse.json({ success: true, ticket });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
