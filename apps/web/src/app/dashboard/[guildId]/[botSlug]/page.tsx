import {
  getGuildById,
  getBotBySlug,
  getWelcomeConfig,
  getTicketConfig,
  getVerificationConfig,
  getTicketStats,
  getGiveawaysByGuild,
  getRouletteConfig,
  getModerationLogsByGuild,
} from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { GiveawaySettings } from "@/components/dashboard/GiveawaySettings";
import { RouletteSettings } from "@/components/dashboard/RouletteSettings";
import { AdminLogsView } from "@/components/dashboard/AdminLogsView";
import { WelcomeSettings } from "@/components/dashboard/WelcomeSettings";
import { TicketSettings } from "@/components/dashboard/TicketSettings";
import { VerificationSettings } from "@/components/dashboard/VerificationSettings";

export default async function BotSettingsPage({
  params,
}: {
  params: Promise<{ guildId: string; botSlug: string }>;
}) {
  const { guildId, botSlug } = await params;
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return (
      <div className="min-h-screen bg-bg-void text-text">
        <SiteHeader />
        <main className="pt-32 container mx-auto px-6 text-center">
          <h1 className="font-display text-4xl font-bold gradient-text mb-4">
            Authentication Required
          </h1>
          <Link href="/login" className="btn btn-primary btn-lg rounded-full font-mono">
            Login with Discord
          </Link>
        </main>
      </div>
    );
  }

  let guild: any;
  let bot: any;

  try {
    const [guildData, botData] = await Promise.all([
      getGuildById(guildId),
      getBotBySlug(botSlug),
    ]);
    guild = guildData;
    bot = botData;
  } catch (error) {
    console.error("Failed to fetch guild/bot data:", error);
    notFound();
  }

  if (!guild || !bot) {
    notFound();
  }

  // Fetch specific config and data based on bot slug
  let welcomeConfig = null;
  let ticketConfig = null;
  let verificationConfig = null;
  let rouletteConfig = null;
  let giveaways: any[] = [];
  let moderationLogs: any[] = [];
  let ticketStats = { open: 0, closed: 0, total: 0 };

  try {
    if (botSlug === "welcome") {
      welcomeConfig = await getWelcomeConfig(guildId);
    } else if (botSlug === "ticket") {
      [ticketConfig, ticketStats] = await Promise.all([
        getTicketConfig(guildId),
        getTicketStats(guildId),
      ]);
    } else if (botSlug === "verification") {
      verificationConfig = await getVerificationConfig(guildId);
    } else if (botSlug === "giveaway") {
      giveaways = await getGiveawaysByGuild(guildId);
    } else if (botSlug === "roulette") {
      rouletteConfig = await getRouletteConfig(guildId);
    } else if (botSlug === "admin") {
      moderationLogs = await getModerationLogsByGuild(guildId);
    }
  } catch (error) {
    console.error("Failed to fetch bot config:", error);
  }

  // Enrich guild object for child components
  const enrichedGuild = {
    ...guild,
    giveaways,
    rouletteConfig,
    moderationLogs,
  };

  return (
    <div className="min-h-screen bg-bg-void text-text">
      <SiteHeader />

      <main className="pt-24 container mx-auto px-6 py-12 max-w-5xl">
        {/* Header Navigation */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold font-display shadow-lg"
              style={{
                backgroundColor: `${bot.colorAccent || "#F2A93B"}20`,
                border: `1px solid ${bot.colorAccent || "#F2A93B"}40`,
                color: bot.colorAccent || "#F2A93B",
              }}
            >
              {bot.name ? bot.name.charAt(0) : "B"}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="font-display text-3xl font-extrabold text-white">
                  {bot.name}
                </h1>
                <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-white/10 text-text-dim">
                  {bot.slug}
                </span>
              </div>
              <p className="text-text-dim text-sm mt-0.5">
                Manage and customize bot behavior for <strong className="text-white">{guild.name}</strong>
              </p>
            </div>
          </div>

          <Link
            href={`/dashboard/${guildId}`}
            className="self-start sm:self-auto px-4 py-2 bg-white/5 hover:bg-white/10 text-text-dim hover:text-white font-mono text-xs rounded-xl border border-white/10 transition-all flex items-center gap-1.5"
          >
            ← Back to Server
          </Link>
        </div>

        {/* Content Box */}
        <div className="card-bg rounded-3xl p-8 border border-white/10 shadow-2xl">
          {botSlug === "giveaway" && <GiveawaySettings guild={enrichedGuild} />}
          {botSlug === "roulette" && <RouletteSettings guild={enrichedGuild} />}
          {botSlug === "admin" && <AdminLogsView guild={enrichedGuild} />}
          {botSlug === "welcome" && (
            <WelcomeSettings guildId={guildId} config={welcomeConfig} />
          )}
          {botSlug === "ticket" && (
            <TicketSettings
              guildId={guildId}
              config={ticketConfig}
              stats={ticketStats}
            />
          )}
          {botSlug === "verification" && (
            <VerificationSettings
              guildId={guildId}
              config={verificationConfig}
            />
          )}
        </div>
      </main>
    </div>
  );
}

export const revalidate = 0;
