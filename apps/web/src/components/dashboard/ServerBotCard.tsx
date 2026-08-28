"use client";

import { useState } from "react";
import Link from "next/link";

interface BotData {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  features: string;
  clientId: string;
  permissions: string;
  iconUrl: string | null;
  colorAccent: string;
  isGlobalActive: boolean;
  isEnabledInGuild: boolean | null;
  isLinked: boolean;
}

interface Props {
  bot: BotData;
  guildId: string;
}

export function ServerBotCard({ bot, guildId }: Props) {
  const [isEnabled, setIsEnabled] = useState(bot.isEnabledInGuild === true);
  const [isUpdating, setIsUpdating] = useState(false);

  // Parse features string if available
  let featuresList: string[] = [];
  try {
    if (bot.features) {
      if (typeof bot.features === "string") {
        featuresList = bot.features.startsWith("[")
          ? JSON.parse(bot.features)
          : bot.features.split(",").map((f) => f.trim());
      }
    }
  } catch {
    featuresList = [];
  }

  // Construct official Discord OAuth invite link
  const permissions = bot.permissions || "8";
  const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${bot.clientId}&permissions=${permissions}&scope=bot%20applications.commands&guild_id=${guildId}&disable_guild_select=true`;

  async function handleToggle() {
    setIsUpdating(true);
    const nextState = !isEnabled;
    setIsEnabled(nextState); // optimistic update

    try {
      const res = await fetch(`/api/dashboard/${guildId}/toggle-bot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ botId: bot.id }),
      });
      if (!res.ok) {
        throw new Error("Failed to update status");
      }
    } catch (err) {
      console.error(err);
      setIsEnabled(!nextState); // revert on error
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <div className="card-bg rounded-2xl p-6 border border-white/5 hover:border-white/15 transition-all duration-300 flex flex-col justify-between group shadow-lg hover:shadow-2xl relative overflow-hidden">
      {/* Accent glow on top */}
      <div
        className="absolute top-0 left-0 right-0 h-1 opacity-60 group-hover:opacity-100 transition-opacity"
        style={{ backgroundColor: bot.colorAccent || "#F2A93B" }}
      />

      <div>
        {/* Header: Icon, Name, Category & Toggle */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold font-display shadow-md flex-shrink-0 transition-transform group-hover:scale-105"
              style={{
                backgroundColor: `${bot.colorAccent || "#F2A93B"}20`,
                border: `1px solid ${bot.colorAccent || "#F2A93B"}40`,
                color: bot.colorAccent || "#F2A93B",
              }}
            >
              {bot.name ? bot.name.charAt(0) : "B"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-lg font-bold text-white group-hover:text-amber-signal transition-colors">
                  {bot.name}
                </h3>
                {bot.isGlobalActive ? (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="System Online" />
                ) : (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-mono">
                    Maintenance
                  </span>
                )}
              </div>
              <p className="text-xs text-text-dim mt-0.5 line-clamp-1">{bot.tagline}</p>
            </div>
          </div>

          {/* Toggle Switch */}
          <button
            onClick={handleToggle}
            disabled={isUpdating}
            title={isEnabled ? "Disable bot in server" : "Enable bot in server"}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              isEnabled ? "bg-emerald-500" : "bg-white/10"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                isEnabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Description */}
        <p className="text-xs text-text-dim leading-relaxed mb-4 line-clamp-2">
          {bot.description || "Powerful Discord bot designed to elevate your server experience."}
        </p>

        {/* Features Chips */}
        {featuresList.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-6">
            {featuresList.slice(0, 3).map((feat, idx) => (
              <span
                key={idx}
                className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-white/5 text-text-dim border border-white/5"
              >
                {feat}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-4 border-t border-white/5">
        <Link
          href={`/dashboard/${guildId}/${bot.slug}`}
          className="flex-1 text-center py-2 px-3 bg-amber-signal/10 hover:bg-amber-signal text-amber-signal hover:text-black font-mono text-xs font-semibold rounded-xl border border-amber-signal/30 hover:border-amber-signal transition-all"
        >
          ⚙️ تخصيص البوت
        </Link>

        <a
          href={inviteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="py-2 px-3 bg-white/5 hover:bg-white/15 text-white font-mono text-xs rounded-xl border border-white/10 transition-all flex items-center gap-1"
          title="Invite bot to this server"
        >
          <span>➕ دعوة</span>
        </a>
      </div>
    </div>
  );
}
