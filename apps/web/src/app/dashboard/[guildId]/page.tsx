import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { notFound } from "next/navigation";
import { Bot } from "@/generated/prisma/client";

export default async function GuildDashboardPage({
  params,
}: {
  params: Promise<{ guildId: string }>;
}) {
  const { guildId } = await params;
  const session = await getServerSession();

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

  const guild = await prisma.guild.findUnique({
    where: { id: guildId },
    include: { guildBots: { include: { bot: true } } },
  }).catch((error) => {
    console.error("Failed to fetch guild:", error);
    return null;
  });

  if (!guild) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-bg-void text-text">
      <SiteHeader />

      <main className="pt-24 container mx-auto px-6 py-12">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-white mb-2">
              {guild.name}
            </h1>
            <p className="text-text-dim">
              Manage your Discord bots for this server
            </p>
          </div>
          <Link
            href="/dashboard"
            className="text-text-dim hover:text-amber-signal font-mono text-sm transition-colors"
          >
            ← Back to Servers
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {guild.guildBots.map((gb) => (
            <Link
              key={gb.id}
              href={`/dashboard/${guildId}/${gb.bot.slug}`}
              className="card-bg rounded-xl p-6 hover:border-amber-signal transition-all duration-200 group"
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center text-xl font-bold"
                  style={{ backgroundColor: gb.bot.colorAccent, color: "#0B0B12" }}
                >
                  {gb.bot.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-display text-xl font-semibold text-white group-hover:text-amber-signal transition-colors">
                    {gb.bot.name}
                  </h3>
                  <p className="text-text-dim text-sm">{gb.bot.tagline}</p>
                  <span
                    className={`text-xs font-mono ${gb.isActive ? "text-green-400" : "text-red-400"}`}
                  >
                    {gb.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="flex justify-center">
          <Link
            href={`/dashboard/${guildId}/tickets`}
            className="btn btn-ghost rounded-xl font-mono text-sm"
          >
            View Ticket Archive
          </Link>
        </div>
      </main>
    </div>
  );
}

export const revalidate = 0;
