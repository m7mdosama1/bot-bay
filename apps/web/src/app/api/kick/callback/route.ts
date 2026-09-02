import { createCipheriv, createHmac, timingSafeEqual } from "crypto";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { getGuildById, saveKickConnection } from "@/lib/prisma";

function encrypt(value: string, secret: string) {
  const key = createHmac("sha256", secret).update("kick-token-encryption").digest();
  const iv = Buffer.alloc(16, 0);
  const cipher = createCipheriv("aes-256-ctr", key, iv);
  return `${cipher.update(value, "utf8", "hex")}${cipher.final("hex")}`;
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const state = request.nextUrl.searchParams.get("state") || "";
  const code = request.nextUrl.searchParams.get("code") || "";
  const storedState = request.cookies.get("kick_oauth_state")?.value;
  const codeVerifier = request.cookies.get("kick_oauth_verifier")?.value;
  const secret = process.env.NEXTAUTH_SECRET;
  const clientId = process.env.KICK_CLIENT_ID;
  const clientSecret = process.env.KICK_CLIENT_SECRET;
  const errorUrl = new URL("/dashboard", process.env.NEXTAUTH_URL);
  if (!session?.user?.id || !state || state !== storedState || !code || !codeVerifier || !secret || !clientId || !clientSecret) {
    errorUrl.searchParams.set("kick", "connection_failed");
    return NextResponse.redirect(errorUrl);
  }

  const decoded = Buffer.from(state, "base64url").toString("utf8").split(":");
  const signature = decoded.pop();
  const nonce = decoded.pop();
  const userId = decoded.pop();
  const guildId = decoded.pop();
  const payload = `${guildId}:${userId}:${nonce}`;
  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  if (!signature || signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected)) || userId !== session.user.id || !guildId) {
    errorUrl.searchParams.set("kick", "invalid_state");
    return NextResponse.redirect(errorUrl);
  }
  const guild = await getGuildById(guildId);
  if (!guild || guild.owner_id !== session.user.id) return NextResponse.redirect(errorUrl);

  try {
    const tokenResponse = await fetch("https://id.kick.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, code, code_verifier: codeVerifier, grant_type: "authorization_code", redirect_uri: `${process.env.NEXTAUTH_URL}/api/kick/callback` }),
    });
    if (!tokenResponse.ok) throw new Error("Kick token exchange failed");
    const token = await tokenResponse.json();
    await saveKickConnection({ guildId, discordUserId: session.user.id, accessToken: encrypt(token.access_token, secret), refreshToken: token.refresh_token ? encrypt(token.refresh_token, secret) : null, expiresAt: token.expires_in ? new Date(Date.now() + Number(token.expires_in) * 1000) : null });
    const successUrl = new URL(`/dashboard/${guildId}/beacon`, process.env.NEXTAUTH_URL);
    successUrl.searchParams.set("kick", "connected");
    const response = NextResponse.redirect(successUrl);
    response.cookies.delete("kick_oauth_state");
    response.cookies.delete("kick_oauth_verifier");
    return response;
  } catch (error) {
    console.error("Kick OAuth callback failed:", error);
    errorUrl.searchParams.set("kick", "connection_failed");
    return NextResponse.redirect(errorUrl);
  }
}