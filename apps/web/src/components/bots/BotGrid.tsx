"use client";

import Link from "next/link";
import Image from "next/image";

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

export function BotGrid({ bots }: { bots: Bot[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {bots.map((bot) => (
        <BotCard key={bot.id} bot={bot} />
      ))}
    </div>
  );
}

function BotCard({ bot }: { bot: Bot }) {
  return (
    <Link href={`/bots/${bot.slug}`} className="group block">
      <div
        className={`
          relative overflow-hidden rounded-xl
          bg-card-bg border border-line
          transition-all duration-500
          group-hover:border-amber-signal group-hover:scale-[1.03]
          group-hover:z-10
        `}
        style={{
          boxShadow: `0 0 20px 0px ${bot.colorAccent}20`,
        }}
      >
        <div className="absolute inset-0 bg-linear-to-br from-amber-signal/5 via-transparent to-violet-deep/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div
              className="w-14 h-14 rounded-xl overflow-hidden flex items-center justify-center transition-transform duration-300 group-hover:scale-105"
              style={{
                backgroundColor: `${bot.colorAccent}20`,
                borderColor: bot.colorAccent,
                borderWidth: 2,
                borderStyle: "solid",
              }}
            >
              <Image src={botArtwork[bot.slug] || "/favicon.svg"} alt="" width={56} height={56} className="h-full w-full object-cover" />
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
