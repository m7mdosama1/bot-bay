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

interface BonusResult {
  reward: number;
  balance: number;
  currencyName: string;
}

const wheelNumbers = Array.from({ length: 37 }, (_, index) => index);

export default function RouletteSessionPage() {
  const [token] = useState(() => typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("token") || "");
  const [data, setData] = useState<SessionData | null>(null);
  const [prediction, setPrediction] = useState("red");
  const [bet, setBet] = useState(10);
  const [result, setResult] = useState<SpinResult | null>(null);
  const [bonus, setBonus] = useState<BonusResult | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    if (token) fetch(`/api/roulette/session?token=${encodeURIComponent(token)}`).then(async (response) => response.ok ? setData(await response.json() as SessionData) : setError((await response.json()).error));
  }, [token]);

  async function spin() {
    setError(""); setResult(null);
    setBonus(null);
    setIsSpinning(true);
    const response = await fetch(`/api/roulette/session?token=${encodeURIComponent(token)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prediction, betAmount: bet }) });
    const payload = await response.json() as SpinResult & { error?: string };
    if (!response.ok) { setIsSpinning(false); return setError(payload.error || "Spin failed"); }
    setWheelRotation((current) => current + 2160 + (360 - payload.number * (360 / 37)));
    window.setTimeout(() => setIsSpinning(false), 3600);
    setResult(payload);
    setData((current) => current ? { ...current, balance: payload.balance } : current);
  }

  async function claimBonus() {
    setError(""); setBonus(null);
    const response = await fetch(`/api/roulette/session?token=${encodeURIComponent(token)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "daily_bonus" }) });
    const payload = await response.json() as BonusResult & { error?: string };
    if (!response.ok) return setError(payload.error || "Reward unavailable");
    setBonus(payload);
    setData((current) => current ? { ...current, balance: payload.balance } : current);
  }

  if (error && !data) return <main className="roulette-shell"><div className="roulette-error"><span>SESSION CLOSED</span><h1>{error}</h1><p>Generate a new private table from Discord to continue.</p></div></main>;
  if (!data) return <main className="roulette-shell"><div className="roulette-loading">Loading your private table...</div></main>;
  return <main className="roulette-shell">
    <div className="roulette-brand"><span className="roulette-mark">✦</span><span>FORTUNE WHEEL</span><small>PRIVATE TABLE</small></div>
    <section className="roulette-header"><div><p className="eyebrow">PLAYER SESSION</p><h1>Your table, your balance.</h1><p className="muted">A private game room opened from Discord.</p></div><div className="balance"><small>AVAILABLE BALANCE</small><strong>{data.balance.toLocaleString()}</strong><span>{data.currencyName}</span></div></section>
    <section className="roulette-table">
      <div className={`roulette-wheel-stage ${isSpinning ? "is-spinning" : ""}`}>
        <div className="roulette-pointer" />
        <div className="roulette-wheel" style={{ transform: `rotate(${wheelRotation}deg)` }}>
          <div className="roulette-wheel-face" />
          {wheelNumbers.map((number) => <span key={number} className={`roulette-number ${number === 0 ? "green" : number % 2 === 0 ? "red" : "black"}`} style={{ transform: `rotate(${number * (360 / 37)}deg) translateY(-8.25rem) rotate(${-number * (360 / 37)}deg)` }}>{number}</span>)}
          <div className="roulette-hub"><span>{isSpinning ? "" : result?.number ?? ""}</span></div>
        </div>
        <div className="roulette-ball" />
      </div>
      <div className="roulette-result-line"><strong>{result ? `${result.number} / ${result.color.toUpperCase()}` : "READY TO SPIN"}</strong><span>{result ? "Result verified by the game server" : "Choose your prediction below"}</span></div>
      <div className="prediction-grid">{predictions.map(([value, label, multiplier]) => <button key={value} className={prediction === value ? "selected" : ""} onClick={() => setPrediction(value)}><span>{label}</span><small>{multiplier}</small></button>)}</div>
      <div className="spin-controls"><label>WAGER <input type="number" min={data.minBet} max={Math.min(data.maxBet, data.balance)} value={bet} onChange={(event) => setBet(Number(event.target.value))} /></label><button className="spin-button" onClick={spin} disabled={isSpinning}>{isSpinning ? "WHEEL IN MOTION" : "SPIN WHEEL"} <span>↗</span></button><button className="bonus-button" onClick={claimBonus} disabled={isSpinning}>DAILY REWARD <span>＋</span></button></div>
      {result && <div className={result.won ? "result-message won" : "result-message lost"}>{result.won ? `You won ${result.payout.toLocaleString()} ${result.currencyName}` : `You lost ${bet.toLocaleString()} ${result.currencyName}`}<small>New balance: {result.balance.toLocaleString()}</small></div>}
      {bonus && <div className="result-message won">Daily reward: +{bonus.reward.toLocaleString()} {bonus.currencyName}<small>New balance: {bonus.balance.toLocaleString()}</small></div>}
      {error && <p className="roulette-inline-error">{error}</p>}
    </section>
    <p className="roulette-footnote">Virtual currency only · This session is private and expires automatically.</p>
  </main>;
}