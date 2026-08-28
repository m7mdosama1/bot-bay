import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdminAllowlisted } from "@/lib/adminAuth";
import {
  toggleBotGlobalStatus,
  updateBotDetails,
  createBotForAdmin,
  deleteBotForAdmin,
} from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !isAdminAllowlisted(session.user.id)) {
    return NextResponse.json({ error: "Unauthorized Admin" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { action, botId, data } = body;

    if (action === "toggle") {
      const result = await toggleBotGlobalStatus(botId);
      return NextResponse.json({ success: true, bot: result });
    }

    if (action === "update") {
      const result = await updateBotDetails(botId, data);
      return NextResponse.json({ success: true, bot: result });
    }

    if (action === "create") {
      const result = await createBotForAdmin(data);
      return NextResponse.json({ success: true, bot: result });
    }

    if (action === "delete") {
      const result = await deleteBotForAdmin(botId);
      return NextResponse.json({ success: true, bot: result });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Admin bot management error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
