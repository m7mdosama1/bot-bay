"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

const botArtwork: Record<string, string> = {
  verification: "/bots/verification.png",
  giveaway: "/bots/giveaway.png",
  roulette: "/bots/roulette.png",
  admin: "/bots/admin.png",
  welcome: "/bots/welcome.png",
  ticket: "/bots/ticket.png",
  beacon: "/bots/beacon.png",
  pulse: "/bots/pulse.png",
  ascend: "/bots/ascend.png",
};

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
  const [isEnabled, setIsEnabled] = useState(bot.isEnabledInGuild === true || bot.isLinked);
  const [isUpdating, setIsUpdating] = useState(false);

  // Parse features list
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

  const permissions = bot.permissions || "8";
  const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${bot.clientId}&permissions=${permissions}&scope=bot%20applications.commands&guild_id=${guildId}&disable_guild_select=true`;

  async function handleToggle() {
    setIsUpdating(true);
    const nextState = !isEnabled;
    setIsEnabled(nextState);

    try {
      const res = await fetch(`/api/dashboard/${guildId}/toggle-bot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ botId: bot.id }),
      });
      if (!res.ok) throw new Error("Failed to update status");
    } catch (err) {
      console.error(err);
      setIsEnabled(!nextState);
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <div className="dashboard-bot-card card-bg rounded-2xl p-5 border border-white/10 transition-all duration-300 flex flex-col justify-between group relative overflow-hidden">
      {/* Accent glow line on top */}
      <div
        className="absolute top-0 left-0 right-0 h-0.5 opacity-80 group-hover:opacity-100 transition-opacity"
        style={{ backgroundColor: bot.colorAccent || "#F2A93B" }}
      />

      <div>
        {/* Header: Icon, Name, Category & Live Toggle */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3.5">
            <div
              className="w-14 h-14 rounded-xl overflow-hidden flex items-center justify-center font-bold font-display shadow-md shrink-0 transition-transform group-hover:scale-105"
              style={{
                backgroundColor: `${bot.colorAccent || "#F2A93B"}20`,
                border: `1px solid ${bot.colorAccent || "#F2A93B"}40`,
                color: bot.colorAccent || "#F2A93B",
              }}
            >
              <Image src={botArtwork[bot.slug] || "/favicon.svg"} alt="" width={56} height={56} className="h-full w-full object-cover" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-lg font-bold text-white group-hover:text-amber-signal transition-colors">
                  {bot.name}
                </h3>
                {bot.isGlobalActive ? (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="System Online" />
                ) : (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-red-500/20 text-red-400 font-mono">
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

        {/* Server Status Badge */}
        <div className="flex items-center gap-2 mb-3">
          {bot.isLinked ? (
            <span className="dashboard-status dashboard-status-online">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Connected to Server
            </span>
          ) : (
            <span className="dashboard-status dashboard-status-pending">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              Invite Required
            </span>
          )}
        </div>

        {/* Description */}
        <p className="text-xs text-text-dim leading-relaxed mb-4 line-clamp-2">
          {bot.description || "Professional Discord bot to elevate your server experience."}
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
      <div className="flex items-center gap-2.5 pt-4 border-t border-white/5">
        <Link
          href={`/dashboard/${guildId}/${bot.slug}`}
          className="dashboard-card-primary flex-1 text-center py-2.5 px-4 font-mono text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5"
        >
          <span>⚙️</span> Customize Settings
        </Link>

        <a
          href={inviteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="py-2.5 px-3.5 bg-white/5 hover:bg-white/15 text-white font-mono text-xs font-semibold rounded-lg border border-white/10 transition-all flex items-center gap-1"
          title="Invite bot to this server"
        >
          <span>➕</span> Invite
        </a>
      </div>
    </div>
  );
}
