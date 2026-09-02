import { randomBytes, createHmac, createHash } from "crypto";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { getGuildById } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const guildId = request.nextUrl.searchParams.get("guildId") || "";
  const userId = session?.user?.id;
  const guild = guildId ? await getGuildById(guildId) : null;
  if (!userId || !guild || guild.owner_id !== userId) {
    return NextResponse.json({ error: "Only the server owner can connect Kick" }, { status: 403 });
  }

  const secret = process.env.NEXTAUTH_SECRET;
  const clientId = process.env.KICK_CLIENT_ID;
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/kick/callback`;
  if (!secret || !clientId) return NextResponse.json({ error: "Kick OAuth is not configured" }, { status: 503 });

  const nonce = randomBytes(24).toString("hex");
  const codeVerifier = randomBytes(32).toString("base64url");
  const codeChallenge = createHash("sha256").update(codeVerifier).digest("base64url");
  const payload = `${guildId}:${userId}:${nonce}`;
  const signature = createHmac("sha256", secret).update(payload).digest("hex");
  const state = Buffer.from(`${payload}:${signature}`).toString("base64url");
  const response = NextResponse.redirect(
    `https://id.kick.com/oauth/authorize?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent("user:read channel:read")}&code_challenge=${encodeURIComponent(codeChallenge)}&code_challenge_method=S256&state=${encodeURIComponent(state)}`
  );
  response.cookies.set("kick_oauth_state", state, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/" });
  response.cookies.set("kick_oauth_verifier", codeVerifier, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/" });
  return response;
}