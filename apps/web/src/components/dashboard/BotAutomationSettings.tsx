"use client";

import { useState } from "react";

interface Props {
  guildId: string;
  botSlug: "pulse" | "ascend";
  config: {
    enabled?: boolean;
    xp_cooldown_seconds?: number;
    xp_per_message_min?: number;
    xp_per_message_max?: number;
  };
}

export function BotAutomationSettings({ guildId, botSlug, config }: Props) {
  const isAscend = botSlug === "ascend";
  const [enabled, setEnabled] = useState(config.enabled !== false);
  const [cooldown, setCooldown] = useState(config.xp_cooldown_seconds || 60);
  const [minimum, setMinimum] = useState(config.xp_per_message_min || 15);
  const [maximum, setMaximum] = useState(config.xp_per_message_max || 25);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function save() {
    setSaving(true);
    setMessage("");
    const body = isAscend
      ? { botSlug, enabled, xpCooldownSeconds: cooldown, xpPerMessageMin: minimum, xpPerMessageMax: maximum }
      : { botSlug, enabled };
    const response = await fetch(`/api/dashboard/${guildId}/settings`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setMessage(response.ok ? "Settings saved for this server." : "Could not save settings.");
    setSaving(false);
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-teal-accent/15 border border-teal-accent/30 flex items-center justify-center text-xl">{isAscend ? "★" : "◌"}</div>
        <div><p className="dashboard-kicker">SERVER CONFIGURATION</p><h3 className="font-display text-xl font-bold text-white">{isAscend ? "Ascend progression" : "Pulse analytics"}</h3><p className="text-text-dim text-sm">These controls belong to this server and are stored independently.</p></div>
      </div>
      <div className="space-y-5 max-w-2xl">
        <label className="flex items-center justify-between p-4 border border-line bg-bg-raised rounded-xl cursor-pointer"><span><strong className="block text-sm text-white">{isAscend ? "Award XP" : "Collect analytics"}</strong><small className="text-text-dim">{isAscend ? "Members earn XP when they participate." : "Record activity without reading message content."}</small></span><input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} className="h-5 w-5 accent-amber-signal" /></label>
        {isAscend && <div className="grid grid-cols-1 md:grid-cols-3 gap-4"><label className="space-y-2 text-xs font-mono text-text-dim">COOLDOWN (SECONDS)<input type="number" min="10" value={cooldown} onChange={(event) => setCooldown(Number(event.target.value))} className="w-full mt-2 px-3 py-2.5 bg-bg-raised border border-line rounded-lg text-white" /></label><label className="space-y-2 text-xs font-mono text-text-dim">MIN XP<input type="number" min="1" value={minimum} onChange={(event) => setMinimum(Number(event.target.value))} className="w-full mt-2 px-3 py-2.5 bg-bg-raised border border-line rounded-lg text-white" /></label><label className="space-y-2 text-xs font-mono text-text-dim">MAX XP<input type="number" min="1" value={maximum} onChange={(event) => setMaximum(Number(event.target.value))} className="w-full mt-2 px-3 py-2.5 bg-bg-raised border border-line rounded-lg text-white" /></label></div>}
      </div>
      <div className="flex items-center gap-4"><button type="button" onClick={save} disabled={saving} className="px-5 py-2.5 bg-amber-signal text-bg-void rounded-lg font-mono text-xs font-bold disabled:opacity-50">{saving ? "Saving..." : "Save server settings"}</button>{message && <span className="text-sm text-teal-accent">{message}</span>}</div>
    </div>
  );
}
