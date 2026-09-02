"use client";

import { useEffect, useState } from "react";

const predictions = [
  ["red", "Red", "2x"], ["black", "Black", "2x"], ["green", "Green", "14x"],
  ["even", "Even", "2x"], ["odd", "Odd", "2x"], ["1-12", "1-12", "3x"],
  ["13-24", "13-24", "3x"], ["25-36", "25-36", "3x"],
];

interface SessionData {
  balance: number;
  currencyName: string;
  minBet: number;
  maxBet: number;
  enabled: boolean;
}

interface SpinResult {
  number: number;
  color: string;
  won: boolean;
  payout: number;
  balance: number;
  currencyName: string;
}

export default function RouletteSessionPage() {
  const [token] = useState(() => typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("token") || "");
  const [data, setData] = useState<SessionData | null>(null);
  const [prediction, setPrediction] = useState("red");
  const [bet, setBet] = useState(10);
  const [result, setResult] = useState<SpinResult | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (token) fetch(`/api/roulette/session?token=${encodeURIComponent(token)}`).then(async (response) => response.ok ? setData(await response.json() as SessionData) : setError((await response.json()).error));
  }, [token]);

  async function spin() {
    setError(""); setResult(null);
    const response = await fetch(`/api/roulette/session?token=${encodeURIComponent(token)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prediction, betAmount: bet }) });
    const payload = await response.json() as SpinResult & { error?: string };
    if (!response.ok) return setError(payload.error || "Spin failed");
    setResult(payload);
    setData((current) => current ? { ...current, balance: payload.balance } : current);
  }

  if (error && !data) return <main className="roulette-shell"><div className="roulette-error"><span>SESSION CLOSED</span><h1>{error}</h1><p>Generate a new private table from Discord to continue.</p></div></main>;
  if (!data) return <main className="roulette-shell"><div className="roulette-loading">Loading your private table...</div></main>;
  return <main className="roulette-shell">
    <div className="roulette-brand"><span className="roulette-mark">✦</span><span>FORTUNE WHEEL</span><small>PRIVATE TABLE</small></div>
    <section className="roulette-header"><div><p className="eyebrow">PLAYER SESSION</p><h1>Your table, your balance.</h1><p className="muted">A private game room opened from Discord.</p></div><div className="balance"><small>AVAILABLE BALANCE</small><strong>{data.balance.toLocaleString()}</strong><span>{data.currencyName}</span></div></section>
    <section className="roulette-table">
      <div className={`roulette-result ${result ? result.color : "idle"}`}><span>{result ? result.number : "?"}</span><small>{result ? result.color.toUpperCase() : "READY TO SPIN"}</small></div>
      <div className="prediction-grid">{predictions.map(([value, label, multiplier]) => <button key={value} className={prediction === value ? "selected" : ""} onClick={() => setPrediction(value)}><span>{label}</span><small>{multiplier}</small></button>)}</div>
      <div className="spin-controls"><label>WAGER <input type="number" min={data.minBet} max={Math.min(data.maxBet, data.balance)} value={bet} onChange={(event) => setBet(Number(event.target.value))} /></label><button className="spin-button" onClick={spin}>SPIN WHEEL <span>↗</span></button></div>
      {result && <div className={result.won ? "result-message won" : "result-message lost"}>{result.won ? `You won ${result.payout.toLocaleString()} ${result.currencyName}` : `You lost ${bet.toLocaleString()} ${result.currencyName}`}<small>New balance: {result.balance.toLocaleString()}</small></div>}
      {error && <p className="roulette-inline-error">{error}</p>}
    </section>
    <p className="roulette-footnote">Virtual currency only · This session is private and expires automatically.</p>
  </main>;
}