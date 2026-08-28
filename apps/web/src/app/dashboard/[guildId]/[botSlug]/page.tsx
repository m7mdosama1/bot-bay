import {
  getGuildById,
  getWelcomeConfig,
  getTicketConfig,
  getVerificationConfig,
  getTicketStats,
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
  try {
    guild = await getGuildById(guildId, { withBots: true });
  } catch (error) {
    console.error("Failed to fetch guild:", error);
    notFound();
  }

  if (!guild) {
    notFound();
  }

  const bot = guild.guildBots.find((gb: any) => gb.bot?.slug === botSlug || gb.botSlug === botSlug)?.bot
    || guild.guildBots.find((gb: any) => gb.bot?.slug === botSlug || gb.botSlug === botSlug);

  if (!bot) {
    notFound();
  }

  // Fetch config data based on bot type
  let welcomeConfig = null;
  let ticketConfig = null;
  let verificationConfig = null;
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
    }
  } catch (error) {
    console.error("Failed to fetch bot config:", error);
  }

  return (
    <div className="min-h-screen bg-bg-void text-text">
      <SiteHeader />

      <main className="pt-24 container mx-auto px-6 py-12">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-white mb-2">
              {(bot.name || "Bot")} Settings
            </h1>
            <p className="text-text-dim">Configure {bot.name || "Bot"} for this server</p>
          </div>
          <Link
            href={`/dashboard/${guildId}`}
            className="text-text-dim hover:text-amber-signal font-mono text-sm transition-colors"
          >
            ← Back to Server
          </Link>
        </div>

        <div className="card-bg rounded-xl p-6">
          {botSlug === "giveaway" && <GiveawaySettings guild={guild} />}
          {botSlug === "roulette" && <RouletteSettings guild={guild} />}
          {botSlug === "admin" && <AdminLogsView guild={guild} />}
          {botSlug === "welcome" && (
            <WelcomeSettings guildId={guildId} config={welcomeConfig} />
          )}
          {botSlug === "ticket" && (
            <TicketSettings guildId={guildId} config={ticketConfig} stats={ticketStats} />
          )}
          {botSlug === "verification" && (
            <VerificationSettings guildId={guildId} config={verificationConfig} />
          )}
        </div>
      </main>
    </div>
  );
}

export const revalidate = 0;
