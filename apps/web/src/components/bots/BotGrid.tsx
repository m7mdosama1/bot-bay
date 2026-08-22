"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";

interface Bot {
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
  isActive: boolean;
}

const botIcons: Record<string, string> = {
  verification: "🛡️",
  giveaway: "🎁",
  roulette: "🎰",
  admin: "⚖️",
  welcome: "👋",
  ticket: "🎫",
};

const floatingAnimations = [
  "float-slow",
  "float-medium",
  "float-fast",
  "float-slow",
  "float-medium",
  "float-fast",
];

export function BotGrid({ bots }: { bots: Bot[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {bots.map((bot, i) => (
        <BotCard key={bot.id} bot={bot} animationClass={floatingAnimations[i % floatingAnimations.length]} />
      ))}
    </div>
  );
}

function BotCard({ bot, animationClass }: { bot: Bot; animationClass: string }) {
  const [imgError, setImgError] = useState(false);
  const icon = botIcons[bot.slug] || bot.name.charAt(0);

  const renderIcon = () => {
    if (bot.iconUrl && !imgError) {
      return (
        <img
          src={bot.iconUrl}
          alt={bot.name}
          className="w-12 h-12 rounded-lg object-cover"
          onError={() => setImgError(true)}
        />
      );
    }
    return <span className="text-2xl">{icon}</span>;
  };

  return (
    <Link href={`/bots/${bot.slug}`} className="group block">
      <div
        className={`
          relative overflow-hidden rounded-xl
          bg-card-bg border border-line
          transition-all duration-500
          group-hover:border-amber-signal group-hover:scale-[1.03]
          group-hover:z-10
          ${animationClass}
          group-hover:animate-none
        `}
        style={{
          boxShadow: `0 0 20px 0px ${bot.colorAccent}20`,
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-amber-signal/5 via-transparent to-violet-deep/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl transition-transform duration-500 group-hover:scale-110"
              style={{
                backgroundColor: `${bot.colorAccent}20`,
                borderColor: bot.colorAccent,
                borderWidth: 2,
                borderStyle: "solid",
              }}
            >
              {renderIcon()}
            </div>

            <div
              className="h-3 w-3 rounded-full animate-pulse"
              style={{ backgroundColor: bot.colorAccent }}
            />
          </div>

          <h3 className="font-display text-xl font-bold text-white mb-1 group-hover:text-amber-signal transition-colors">
            {bot.name}
          </h3>
          <p className="text-text-dim text-sm font-mono mb-3">{bot.tagline}</p>

          <p className="text-text-dim text-sm line-clamp-2 mb-4">
            {bot.description}
          </p>

          <div className="flex items-center justify-between pt-3 border-t border-line">
            <span className="text-xs text-text-dim font-mono">
              {JSON.parse(bot.features).length} features
            </span>
            <span className="text-amber-signal text-xs font-mono group-hover:translate-x-1 transition-transform">
              → View details
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
