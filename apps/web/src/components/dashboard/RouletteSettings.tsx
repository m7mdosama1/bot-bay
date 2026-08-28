"use client";

import { useState } from "react";

interface Props {
  guild: {
    id: string;
    name: string;
    rouletteConfig?: any;
  };
}

export function RouletteSettings({ guild }: Props) {
  const config = guild.rouletteConfig;
  const [minBet, setMinBet] = useState(config?.min_bet || config?.minBet || 10);
  const [maxBet, setMaxBet] = useState(config?.max_bet || config?.maxBet || 10000);
  const [currencyName, setCurrencyName] = useState(config?.currency_name || config?.currencyName || "Coins");
  const [enabled, setEnabled] = useState(config?.enabled !== false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);

    try {
      const res = await fetch(`/api/dashboard/${guild.id}/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          botSlug: "roulette",
          minBet,
          maxBet,
          currencyName,
          enabled,
        }),
      });

      if (!res.ok) throw new Error("Failed to save settings");
      setMsg({ type: "success", text: "✓ Roulette & casino settings saved to Discord successfully!" });
      setTimeout(() => setMsg(null), 3500);
    } catch (err: any) {
      setMsg({ type: "error", text: err.message || "Failed to save settings" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center text-2xl">
          🎡
        </div>
        <div>
          <h3 className="font-display text-xl font-bold text-white">
            Fortune Wheel — Roulette & Economy
          </h3>
          <p className="text-text-dim text-sm">
            Customize server virtual currency, betting limits, and casino mini-games
          </p>
        </div>
      </div>

      {msg && (
        <div
          className={`p-4 rounded-2xl font-mono text-sm border shadow-lg ${
            msg.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              : "bg-red-500/10 border-red-500/30 text-red-400"
          }`}
        >
          {msg.text}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Currency Name */}
          <div className="space-y-2">
            <label className="block text-xs font-mono text-text-dim">
              Virtual Currency Name
            </label>
            <input
              type="text"
              value={currencyName}
              onChange={(e) => setCurrencyName(e.target.value)}
              placeholder="Coins / Credits / Gems"
              className="w-full px-4 py-2.5 bg-bg-raised border border-white/10 rounded-xl text-white font-mono text-sm focus:border-amber-signal/50 focus:outline-none"
            />
            <p className="text-[11px] text-text-dim">Name of the server token shown on user balances and bet results.</p>
          </div>

          {/* Min Bet */}
          <div className="space-y-2">
            <label className="block text-xs font-mono text-text-dim">
              Minimum Bet Limit
            </label>
            <input
              type="number"
              min="1"
              value={minBet}
              onChange={(e) => setMinBet(parseInt(e.target.value, 10))}
              className="w-full px-4 py-2.5 bg-bg-raised border border-white/10 rounded-xl text-white font-mono text-sm focus:border-amber-signal/50 focus:outline-none"
            />
            <p className="text-[11px] text-text-dim">Minimum allowed wager amount per spin.</p>
          </div>

          {/* Max Bet */}
          <div className="space-y-2">
            <label className="block text-xs font-mono text-text-dim">
              Maximum Bet Limit
            </label>
            <input
              type="number"
              min="10"
              value={maxBet}
              onChange={(e) => setMaxBet(parseInt(e.target.value, 10))}
              className="w-full px-4 py-2.5 bg-bg-raised border border-white/10 rounded-xl text-white font-mono text-sm focus:border-amber-signal/50 focus:outline-none"
            />
            <p className="text-[11px] text-text-dim">Maximum wager cap per individual round.</p>
          </div>

          {/* Enable Toggle */}
          <div className="space-y-2 flex flex-col justify-end">
            <div className="p-4 bg-bg-raised/70 rounded-xl border border-white/5 flex items-center justify-between">
              <div>
                <span className="text-xs font-mono font-bold text-white block">Game Availability</span>
                <span className="text-[11px] text-text-dim">Allow members to spin and place bets</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-white/10 rounded-full peer-checked:bg-amber-500 transition-colors"></div>
                <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-5"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Save button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-amber-signal hover:bg-amber-signal/90 text-black font-mono font-bold text-sm rounded-xl transition-all shadow-lg disabled:opacity-50"
          >
            {saving ? "Saving..." : "💾 Save Settings"}
          </button>
        </div>
      </form>
    </div>
  );
}
