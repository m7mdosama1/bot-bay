import { NextRequest, NextResponse } from "next/server";
import {
  upsertWelcomeConfig,
  upsertTicketConfig,
  upsertVerificationConfig,
} from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;
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
