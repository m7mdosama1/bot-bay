"use client";

import { useState } from "react";

interface Feed { id: string; platform: string; sourceRef: string; targetChannelId: string; enabled: boolean; webhookUrl?: string; }
interface KickConnection { guildId: string; kickUserId: string | null; kickUsername: string | null; }

export function BeaconSettings({ guildId, initialFeeds, kickConnection: initialKickConnection }: { guildId: string; initialFeeds: Feed[]; kickConnection: KickConnection | null }) {
  const [feeds, setFeeds] = useState(initialFeeds);
  const [kickConnection, setKickConnection] = useState(initialKickConnection);
  const [platform, setPlatform] = useState("webhook");
  const [sourceRef, setSourceRef] = useState("");
  const [targetChannelId, setTargetChannelId] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function addFeed(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setMessage("");
    const response = await fetch(`/api/dashboard/${guildId}/settings`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ botSlug: "beacon_add_feed", platform, sourceRef, targetChannelId }) });
    const payload = await response.json();
    if (response.ok) { setFeeds([payload.data, ...feeds]); setSourceRef(""); setTargetChannelId(""); setMessage("Feed added. Beacon will start watching it automatically."); }
    else setMessage(payload.error || "Could not add feed.");
    setSaving(false);
  }

  async function toggleFeed(feed: Feed) {
    const response = await fetch(`/api/dashboard/${guildId}/settings`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ botSlug: "beacon_toggle_feed", feedId: feed.id, enabled: !feed.enabled }) });
    if (response.ok) setFeeds(feeds.map((item) => item.id === feed.id ? { ...item, enabled: !item.enabled } : item));
  }

  async function disconnectKick() {
    const response = await fetch(`/api/kick/disconnect?guildId=${encodeURIComponent(guildId)}`, { method: "POST" });
    if (response.ok) {
      setKickConnection(null);
      setMessage("Kick account disconnected.");
    }
  }

  return <div className="space-y-8"><div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"><div><p className="dashboard-kicker">SERVER AUTOMATION</p><h3 className="font-display text-xl font-bold text-white">Beacon notifications</h3><p className="text-text-dim text-sm">Each server owns its feeds and Discord destination. No Twitch, Kick, streamer, or channel credentials are stored in environment variables.</p></div>{kickConnection ? <div className="flex items-center gap-3 px-4 py-2.5 bg-green-500/10 text-green-400 border border-green-500/30 rounded-lg font-mono text-xs"><span>Connected: {kickConnection.kickUsername || kickConnection.kickUserId || "Kick account"}</span><button type="button" onClick={disconnectKick} className="text-red-400 hover:text-red-300">Disconnect</button></div> : <a href={`/api/kick/connect?guildId=${encodeURIComponent(guildId)}`} className="px-4 py-2.5 bg-green-500/15 text-green-400 border border-green-500/30 rounded-lg font-mono text-xs font-bold text-center">Connect Kick</a>}</div><form onSubmit={addFeed} className="grid grid-cols-1 md:grid-cols-[9rem_1fr_1fr_auto] gap-3 items-end"><label className="text-xs font-mono text-text-dim">SOURCE<select value={platform} onChange={(event) => setPlatform(event.target.value)} className="w-full mt-2 px-3 py-2.5 bg-bg-raised border border-line rounded-lg text-white"><option value="webhook">Any platform webhook</option><option value="rss">RSS</option></select></label><label className="text-xs font-mono text-text-dim">PROVIDER NAME / URL<input value={sourceRef} onChange={(event) => setSourceRef(event.target.value)} placeholder={platform === "rss" ? "https://.../feed.xml" : "Twitch, Kick, YouTube, Streamlabs..."} className="w-full mt-2 px-3 py-2.5 bg-bg-raised border border-line rounded-lg text-white" required={platform !== "webhook"} /></label><label className="text-xs font-mono text-text-dim">DISCORD CHANNEL ID<input value={targetChannelId} onChange={(event) => setTargetChannelId(event.target.value)} placeholder="123456789" className="w-full mt-2 px-3 py-2.5 bg-bg-raised border border-line rounded-lg text-white" required /></label><button disabled={saving} className="px-4 py-2.5 bg-amber-signal text-bg-void rounded-lg font-mono text-xs font-bold disabled:opacity-50">{saving ? "Adding..." : "Add feed"}</button></form>{message && <p className="text-sm text-teal-accent">{message}</p>}<div className="space-y-2">{feeds.length === 0 ? <p className="p-5 border border-dashed border-line text-sm text-text-dim">No feeds configured for this server.</p> : feeds.map((feed) => <div key={feed.id} className="p-4 border border-line bg-bg-raised rounded-xl"><div className="flex items-center gap-4"><span className="w-2 h-2 rounded-full" style={{ background: feed.enabled ? "var(--teal-accent)" : "var(--text-dim)" }} /><strong className="w-20 text-xs uppercase text-amber-signal font-mono">{feed.platform}</strong><span className="flex-1 text-sm text-white truncate">{feed.sourceRef || "Webhook endpoint"} <small className="text-text-dim">→ #{feed.targetChannelId}</small></span><button type="button" onClick={() => toggleFeed(feed)} className="text-xs font-mono text-text-dim hover:text-white">{feed.enabled ? "Pause" : "Resume"}</button></div>{feed.webhookUrl && <p className="mt-2 text-xs text-text-dim font-mono break-all">Webhook URL: {feed.webhookUrl}</p>}</div>)}</div></div>;
}