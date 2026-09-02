import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { db } from "@/lib/prisma";

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function sessionFor(token: string) {
  const result = await db.query(
    `SELECT s.guild_id, s.user_id, s.expires_at, b.balance, c.min_bet, c.max_bet, c.currency_name, c.enabled
     FROM roulette_sessions s
     JOIN roulette_balances b ON b.guild_id = s.guild_id AND b.user_id = s.user_id
     LEFT JOIN roulette_configs c ON c.guild_id = s.guild_id
     WHERE s.token_hash = $1 AND s.expires_at > NOW()`,
    [hashToken(token)]
  );
  return result.rows[0] || null;
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Session token is required" }, { status: 400 });
  const session = await sessionFor(token);
  if (!session) return NextResponse.json({ error: "This private table has expired" }, { status: 401 });
  return NextResponse.json({ balance: session.balance, currencyName: session.currency_name || "Coins", minBet: session.min_bet || 10, maxBet: session.max_bet || 10000, enabled: session.enabled !== false });
}

export async function POST(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Session token is required" }, { status: 400 });
  const active = await sessionFor(token);
  if (!active) return NextResponse.json({ error: "This private table has expired" }, { status: 401 });
  const body = await request.json();
  if (body.action === "daily_bonus") {
    const client = await db.getClient();
    try {
      await client.query("BEGIN");
      const locked = await client.query("SELECT balance, daily_claimed_at FROM roulette_balances WHERE guild_id = $1 AND user_id = $2 FOR UPDATE", [active.guild_id, active.user_id]);
      if (!locked.rows[0]) throw new Error("Balance record not found");
      if (locked.rows[0].daily_claimed_at && new Date(locked.rows[0].daily_claimed_at).toISOString().slice(0, 10) === new Date().toISOString().slice(0, 10)) throw new Error("Daily reward already claimed");
      const reward = crypto.randomInt(100, 301);
      const newBalance = locked.rows[0].balance + reward;
      await client.query("UPDATE roulette_balances SET balance = $1, daily_claimed_at = NOW(), updated_at = NOW() WHERE guild_id = $2 AND user_id = $3", [newBalance, active.guild_id, active.user_id]);
      await client.query("COMMIT");
      return NextResponse.json({ reward, balance: newBalance, currencyName: active.currency_name || "Coins" });
    } catch (error) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: error instanceof Error ? error.message : "Reward failed" }, { status: 409 });
    } finally {
      client.release();
    }
  }
  const { prediction, betAmount } = body;
  const bet = Number(betAmount);
  if (!active.enabled) return NextResponse.json({ error: "Roulette is disabled" }, { status: 409 });
  if (!Number.isInteger(bet) || bet < active.min_bet || bet > active.max_bet || bet > active.balance) return NextResponse.json({ error: "Invalid bet or insufficient balance" }, { status: 400 });
  const number = crypto.randomInt(0, 37);
  const color = number === 0 ? "green" : number % 2 === 0 ? "red" : "black";
  const won = prediction === color || (prediction === "even" && number > 0 && number % 2 === 0) || (prediction === "odd" && number % 2 === 1) || (prediction === "1-12" && number >= 1 && number <= 12) || (prediction === "13-24" && number >= 13 && number <= 24) || (prediction === "25-36" && number >= 25 && number <= 36);
  const multiplier = prediction === "green" ? 14 : ["1-12", "13-24", "25-36"].includes(prediction) ? 3 : 2;
  const payout = won ? bet * multiplier : 0;
  const client = await db.getClient();
  try {
    await client.query("BEGIN");
    const locked = await client.query("SELECT balance FROM roulette_balances WHERE guild_id = $1 AND user_id = $2 FOR UPDATE", [active.guild_id, active.user_id]);
    if (!locked.rows[0] || locked.rows[0].balance < bet) throw new Error("Balance changed, try again");
    const newBalance = locked.rows[0].balance - bet + payout;
    await client.query("UPDATE roulette_balances SET balance = $1, updated_at = NOW() WHERE guild_id = $2 AND user_id = $3", [newBalance, active.guild_id, active.user_id]);
    await client.query("INSERT INTO roulette_plays (id, guild_id, user_id, prediction, bet_amount, result_number, result_color, payout, created_at) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NOW())", [active.guild_id, active.user_id, prediction, bet, number, color, payout]);
    await client.query("COMMIT");
    return NextResponse.json({ number, color, won, payout, balance: newBalance, currencyName: active.currency_name || "Coins" });
  } catch (error) {
    await client.query("ROLLBACK");
    return NextResponse.json({ error: error instanceof Error ? error.message : "Spin failed" }, { status: 409 });
  } finally {
    client.release();
  }
}