import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { TicketArchiveTable } from "@/components/dashboard/TicketArchiveTable";

export default async function GuildTicketsPage({
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
      tickets: {
        orderBy: { createdAt: "desc" },
      },
    },
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
              Ticket Archive
            </h1>
            <p className="text-text-dim">{guild.name} — all tickets (open and closed)</p>
          </div>
          <Link
            href={`/dashboard/${guildId}`}
            className="text-text-dim hover:text-amber-signal font-mono text-sm transition-colors"
          >
            ← Back to Server
          </Link>
        </div>

        <div className="card-bg rounded-xl p-6">
          <TicketArchiveTable tickets={guild.tickets} />
        </div>
      </main>
    </div>
  );
}

export const revalidate = 0;
