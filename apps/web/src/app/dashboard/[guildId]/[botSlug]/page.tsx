import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { GiveawaySettings } from "@/components/dashboard/GiveawaySettings";
import { RouletteSettings } from "@/components/dashboard/RouletteSettings";
import { AdminLogsView } from "@/components/dashboard/AdminLogsView";

export default async function BotSettingsPage({
  params,
}: {
  params: Promise<{ guildId: string; botSlug: string }>;
}) {
  const { guildId, botSlug } = await params;
  const session = await getServerSession();

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

  const guild = await prisma.guild.findUnique({
    where: { id: guildId },
    include: {
      guildBots: { include: { bot: true } },
      giveaways: true,
      rouletteConfig: true,
      moderationLogs: true,
    },
  }).catch((error) => {
    console.error("Failed to fetch guild:", error);
    return null;
  });

  if (!guild) {
    notFound();
  }

  const bot = guild.guildBots.find((gb) => gb.bot.slug === botSlug)?.bot;

  if (!bot) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-bg-void text-text">
      <SiteHeader />

      <main className="pt-24 container mx-auto px-6 py-12">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-white mb-2">
              {bot.name} Settings
            </h1>
            <p className="text-text-dim">Configure {bot.name} for this server</p>
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
          {botSlug === "ticket" && (
            <div className="text-center py-8">
              <h3 className="font-display text-xl font-semibold text-white mb-4">
                Ticket Bot
              </h3>
              <p className="text-text-dim mb-4">
                Use <code className="font-mono text-amber-signal">/ticket-setup</code> in Discord to configure the ticket panel.
              </p>
              <Link
                href={`/dashboard/${guildId}/tickets`}
                className="btn btn-primary btn-lg rounded-full font-mono text-sm"
              >
                View Ticket Archive
              </Link>
            </div>
          )}
          {botSlug === "verification" && (
            <div className="text-center py-8">
              <h3 className="font-display text-xl font-semibold text-white mb-4">
                Verification Bot
              </h3>
              <p className="text-text-dim">
                Use <code className="font-mono text-amber-signal">/verify-setup</code> in Discord to configure verification.
              </p>
            </div>
          )}
          {botSlug === "welcome" && (
            <div className="text-center py-8">
              <h3 className="font-display text-xl font-semibold text-white mb-4">
                Welcome Bot
              </h3>
              <p className="text-text-dim">
                Use <code className="font-mono text-amber-signal">/welcome-setup</code> in Discord to configure welcome channels.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export const revalidate = 0;
