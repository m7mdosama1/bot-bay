import { fetchUserGuilds, syncUserGuilds, DiscordGuildWithBots } from "@/lib/discordApi";
import { getGuildById } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { SiteHeader } from "@/components/layout/SiteHeader";

export default async function DashboardPage() {
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

  const accessToken = session.accessToken as string;
  const guilds = await fetchUserGuilds(accessToken);
  await syncUserGuilds(
    session.user.id,
    session.user.username || session.user.name || "Unknown",
    session.user.avatar || null,
    guilds
  ).catch((error) => {
    console.error("Failed to sync user guilds:", error);
  });

  const guildsWithBots: DiscordGuildWithBots[] = await Promise.all(
    guilds.map(async (guild) => {
      try {
        const guildRow = await getGuildById(guild.id, { withBots: true });
        const dbGuildBots = guildRow?.guildBots || [];

        return {
          ...guild,
          bots: dbGuildBots.map((gb: any) => ({
            id: gb.id,
            botId: gb.botId,
            isActive: gb.isActive,
            addedAt: gb.addedAt,
            bot: {
              id: gb.bot?.id || gb.botId,
              name: gb.bot?.name || gb.botName,
              slug: gb.bot?.slug || gb.botSlug,
              colorAccent: gb.bot?.colorAccent || gb.botColorAccent,
              iconUrl: gb.bot?.iconUrl || gb.botIconUrl,
            },
          })),
        };
      } catch (error) {
        console.error("Failed to fetch guild bots:", error);
        return { ...guild, bots: [] };
      }
    })
  );

  const managedGuilds = guildsWithBots.filter((g) => g.owner || g.permissions.includes("8"));

  return (
    <div className="min-h-screen bg-bg-void text-text">
      <SiteHeader />

      <main className="pt-24 container mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-white mb-2">
            Your Servers
          </h1>
          <p className="text-text-dim">
            Select a server to manage your bots
          </p>
        </div>

        {managedGuilds.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-text-dim mb-4">
              You don't have any servers you can manage.
            </p>
            <p className="text-sm text-text-dim">
              Make sure you have the Administrator permission in your server.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {managedGuilds.map((guild) => (
              <Link
                key={guild.id}
                href={`/dashboard/${guild.id}`}
                className="card-bg rounded-xl p-4 hover:border-amber-signal transition-all duration-200 group"
              >
                <div className="flex items-center gap-3">
                  {guild.icon ? (
                    <img
                      src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`}
                      alt={guild.name}
                      className="w-10 h-10 rounded"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded bg-gray-600 flex items-center justify-center">
                      {guild.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <h3 className="font-medium text-white group-hover:text-amber-signal transition-colors">
                      {guild.name}
                    </h3>
                    <p className="text-xs text-text-dim">
                      {guild.bots.length} bot{guild.bots.length !== 1 ? "s" : ""} added
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export const revalidate = 0;
