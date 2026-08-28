import {
  getGuildById,
  getAllBotsForGuild,
  getGuildOverviewStats,
} from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { ServerBotCard } from "@/components/dashboard/ServerBotCard";
import { notFound } from "next/navigation";

export default async function GuildDashboardPage({
  params,
}: {
  params: Promise<{ guildId: string }>;
}) {
  const { guildId } = await params;
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return (
      <div className="min-h-screen bg-bg-void text-text">
        <SiteHeader />
        <main className="pt-32 container mx-auto px-6 text-center">
          <h1 className="font-display text-4xl font-bold gradient-text mb-4">
            Authentication Required
          </h1>
          <p className="text-text-dim mb-6">
            Please log in to access your dashboard.
          </p>
          <Link href="/login" className="btn btn-primary btn-lg rounded-full font-mono">
            Login with Discord
          </Link>
        </main>
      </div>
    );
  }

  let guild: any;
  let allBots: any[] = [];
  let stats = {
    activeBots: 0,
    totalTickets: 0,
    openTickets: 0,
    activeGiveaways: 0,
    modLogsCount: 0,
  };

  try {
    const [guildData, botsData, statsData] = await Promise.all([
      getGuildById(guildId),
      getAllBotsForGuild(guildId),
      getGuildOverviewStats(guildId),
    ]);
    guild = guildData;
    allBots = botsData;
    stats = statsData;
  } catch (error) {
    console.error("Failed to fetch guild dashboard data:", error);
    notFound();
  }

  if (!guild) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-bg-void text-text">
      <SiteHeader />

      <main className="pt-24 container mx-auto px-6 py-10 max-w-7xl">
        {/* Server Header Banner */}
        <div className="relative rounded-3xl p-8 mb-10 overflow-hidden border border-white/10 bg-gradient-to-br from-bg-raised/80 via-bg-raised/40 to-bg-void shadow-2xl backdrop-blur-md">
          {/* Subtle glow in background */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-amber-signal/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              {guild.icon_url ? (
                <img
                  src={guild.icon_url}
                  alt={guild.name}
                  className="w-20 h-20 rounded-2xl border-2 border-amber-signal/40 shadow-xl object-cover"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-amber-signal/20 border-2 border-amber-signal/40 flex items-center justify-center text-3xl font-bold font-display text-amber-signal shadow-xl">
                  {guild.name ? guild.name.charAt(0) : "S"}
                </div>
              )}
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="font-display text-3xl md:text-4xl font-extrabold text-white">
                    {guild.name}
                  </h1>
                </div>
                <p className="text-text-dim text-xs font-mono mt-1">
                  Server ID: <span className="text-white/60">{guild.id}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href={`/dashboard/${guildId}/tickets`}
                className="px-5 py-2.5 bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 font-mono text-xs font-semibold rounded-xl border border-blue-500/30 transition-all flex items-center gap-2 shadow"
              >
                <span>🎫</span> Ticket Archive
                {stats.openTickets > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-blue-500 text-white text-[10px] font-bold">
                    {stats.openTickets} Open
                  </span>
                )}
              </Link>

              <Link
                href="/dashboard"
                className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-text-dim hover:text-white font-mono text-xs rounded-xl border border-white/10 transition-all"
              >
                ← My Servers
              </Link>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-white/5">
            <div className="bg-bg-void/50 rounded-2xl p-4 border border-white/5 shadow-sm">
              <div className="text-xs font-mono text-text-dim">Active Bots</div>
              <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                {stats.activeBots} <span className="text-xs text-text-dim font-normal">/ {allBots.length} Total</span>
              </div>
            </div>

            <div className="bg-bg-void/50 rounded-2xl p-4 border border-white/5 shadow-sm">
              <div className="text-xs font-mono text-text-dim">Open Support Tickets</div>
              <div className="text-2xl font-bold font-mono text-blue-400 mt-1">
                {stats.openTickets} <span className="text-xs text-text-dim font-normal">({stats.totalTickets} Total)</span>
              </div>
            </div>

            <div className="bg-bg-void/50 rounded-2xl p-4 border border-white/5 shadow-sm">
              <div className="text-xs font-mono text-text-dim">Active Giveaways</div>
              <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
                {stats.activeGiveaways}
              </div>
            </div>

            <div className="bg-bg-void/50 rounded-2xl p-4 border border-white/5 shadow-sm">
              <div className="text-xs font-mono text-text-dim">Moderation Logs</div>
              <div className="text-2xl font-bold font-mono text-violet-400 mt-1">
                {stats.modLogsCount}
              </div>
            </div>
          </div>
        </div>

        {/* Section: Bots Management */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold text-white flex items-center gap-2">
              <span>🤖</span> Available Discord Bots
            </h2>
            <p className="text-text-dim text-sm mt-1">
              Enable, customize, and invite any bot to your server with one click
            </p>
          </div>
          <span className="text-xs font-mono px-3.5 py-1.5 rounded-full bg-white/5 text-text-dim border border-white/10">
            {allBots.length} Bots Available
          </span>
        </div>

        {/* Bots Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {allBots.map((bot: any) => (
            <ServerBotCard
              key={bot.id}
              bot={bot}
              guildId={guildId}
            />
          ))}
        </div>
      </main>
    </div>
  );
}

export const revalidate = 0;
