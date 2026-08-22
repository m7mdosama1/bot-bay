import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";

export async function GET() {
  try {
    const result = await db.query("SELECT COUNT(*) FROM bots");
    return NextResponse.json({ count: parseInt(result.rows[0].count, 10) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
