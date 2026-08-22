import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { TicketTranscriptView } from "@/components/admin/TicketTranscriptView";

export default async function UserTicketTranscriptPage({
  params,
}: {
  params: Promise<{ guildId: string; ticketId: string }>;
}) {
  const { guildId, ticketId } = await params;
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

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: { guild: true },
  });

  if (!ticket || ticket.guildId !== guildId) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-bg-void text-text">
      <SiteHeader />
      <main className="pt-24 container mx-auto px-6 py-12">
        <TicketTranscriptView ticket={ticket} />
      </main>
    </div>
  );
}

export const revalidate = 0;
