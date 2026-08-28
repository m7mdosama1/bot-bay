"use client";

import { useState } from "react";
import Link from "next/link";

interface Props {
  guildId: string;
  config: any;
  stats: { open: number; closed: number; total: number };
}

export function TicketSettings({ guildId, config, stats }: Props) {
  const [channelId, setChannelId] = useState(config?.channel_id || "");
  const [categoryId, setCategoryId] = useState(config?.category_id || "");
  const [logChannelId, setLogChannelId] = useState(config?.log_channel_id || "");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  async function handleSave() {
    setSaving(true);
    setStatus("idle");
    try {
      const res = await fetch(`/api/dashboard/${guildId}/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          botSlug: "ticket",
          channelId: channelId || undefined,
          categoryId: categoryId || undefined,
          logChannelId: logChannelId || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setStatus("success");
      setTimeout(() => setStatus("idle"), 3000);
    } catch {
      setStatus("error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center text-xl">🎫</div>
        <div>
          <h3 className="font-display text-xl font-bold text-white">Ticket Bot Settings</h3>
          <p className="text-text-dim text-sm">إعدادات بوت التذاكر</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-bg-raised rounded-lg p-4 border border-white/5 text-center">
          <div className="text-2xl font-bold font-mono text-white">{stats.total}</div>
          <div className="text-xs text-text-dim mt-1">إجمالي التذاكر</div>
        </div>
        <div className="bg-bg-raised rounded-lg p-4 border border-emerald-500/20 text-center">
          <div className="text-2xl font-bold font-mono text-emerald-400">{stats.open}</div>
          <div className="text-xs text-text-dim mt-1">مفتوحة</div>
        </div>
        <div className="bg-bg-raised rounded-lg p-4 border border-red-500/20 text-center">
          <div className="text-2xl font-bold font-mono text-red-400">{stats.closed}</div>
          <div className="text-xs text-text-dim mt-1">مغلقة</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Panel Channel ID */}
        <div className="space-y-2">
          <label className="block text-sm font-mono text-text-dim">
            Panel Channel ID
            <span className="text-amber-signal ml-1">*</span>
          </label>
          <input
            type="text"
            value={channelId}
            onChange={(e) => setChannelId(e.target.value)}
            placeholder="e.g. 1234567890123456789"
            className="w-full px-4 py-2.5 bg-bg-raised border border-white/10 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all placeholder:text-white/20"
          />
          <p className="text-xs text-text-dim">القناة اللي هيتبعت فيها لوحة التذاكر</p>
        </div>

        {/* Category ID */}
        <div className="space-y-2">
          <label className="block text-sm font-mono text-text-dim">
            Ticket Category ID
          </label>
          <input
            type="text"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            placeholder="e.g. 1234567890123456789"
            className="w-full px-4 py-2.5 bg-bg-raised border border-white/10 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all placeholder:text-white/20"
          />
          <p className="text-xs text-text-dim">الكاتيجوري اللي هيتفتح فيها قنوات التذاكر</p>
        </div>

        {/* Log Channel ID */}
        <div className="space-y-2 md:col-span-2">
          <label className="block text-sm font-mono text-text-dim">
            Log Channel ID
          </label>
          <input
            type="text"
            value={logChannelId}
            onChange={(e) => setLogChannelId(e.target.value)}
            placeholder="e.g. 1234567890123456789"
            className="w-full px-4 py-2.5 bg-bg-raised border border-white/10 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all placeholder:text-white/20"
          />
          <p className="text-xs text-text-dim">القناة اللي هيتبعت فيها لوجات التذاكر (Transcript)</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 bg-blue-500 hover:bg-blue-400 disabled:opacity-50 text-white font-mono font-bold text-sm rounded-lg transition-all"
          >
            {saving ? "Saving..." : "💾 Save Settings"}
          </button>
          {status === "success" && (
            <span className="text-emerald-400 text-sm font-mono animate-pulse">✓ Saved!</span>
          )}
          {status === "error" && (
            <span className="text-red-400 text-sm font-mono">✗ Failed</span>
          )}
        </div>
        <Link
          href={`/dashboard/${guildId}/tickets`}
          className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-text-dim hover:text-white font-mono text-sm rounded-lg transition-all border border-white/10"
        >
          📋 View Ticket Archive
        </Link>
      </div>
    </div>
  );
}
