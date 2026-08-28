import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { TicketTranscriptView } from "@/components/admin/TicketTranscriptView";
import { getTicketById } from "@/lib/prisma";

export default async function UserTicketTranscriptPage({
  params,
}: {
  params: Promise<{ guildId: string; ticketId: string }>;
}) {
  const { guildId, ticketId } = await params;
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

  let ticket;
  try {
    ticket = await getTicketById(ticketId);
  } catch (error) {
    console.error("Failed to fetch ticket:", error);
    notFound();
  }

  if (!ticket || ticket.guild_id !== guildId) {
    notFound();
  }

  const ticketWithGuild = {
    ...ticket,
    guild: {
      name: ticket.guildName,
      iconUrl: ticket.guildIconUrl,
    },
  };

  return (
    <div className="min-h-screen bg-bg-void text-text">
      <SiteHeader />
      <main className="pt-24 container mx-auto px-6 py-12">
        <TicketTranscriptView ticket={ticketWithGuild} />
      </main>
    </div>
  );
}

export const revalidate = 0;
