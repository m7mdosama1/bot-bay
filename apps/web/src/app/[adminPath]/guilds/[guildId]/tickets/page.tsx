import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { verifyAdminSession } from "@/lib/adminAuth";
import { AdminTicketList } from "@/components/admin/AdminTicketList";

export default async function GuildTicketsAdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ adminPath: string; guildId: string }>;
  searchParams?: Promise<{ status?: string }>;
}) {
  const { adminPath, guildId } = await params;
  const sp = await searchParams;

  if (adminPath !== process.env.ADMIN_SECRET_PATH) {
    notFound();
  }

  const session = await getServerSession();

  const adminSession = await verifyAdminSession(
    session?.user?.id,
    session?.accessToken as string
  );

  if (!adminSession.authenticated) {
    const redirectUrl = `/${process.env.ADMIN_SECRET_PATH}/verify-2fa?callbackUrl=%2F${process.env.ADMIN_SECRET_PATH}%2Fguilds%2F${guildId}%2Ftickets`;
    return (
      <div className="min-h-screen bg-bg-void text-white">
        <SiteHeader />
        <main className="pt-32 container mx-auto px-6 text-center">
          <h1 className="font-display text-4xl font-bold gradient-text mb-4">
            Two-Factor Authentication Required
          </h1>
          <p className="text-text-dim mb-6">
            Enter your TOTP code to access this page.
          </p>
          <Link href={redirectUrl} className="btn btn-primary btn-lg rounded-full font-mono">
            Verify Admin Access
          </Link>
        </main>
      </div>
    );
  }

  const statusFilter = sp?.status || "all";
  const where: any = { guildId };
  if (statusFilter !== "all") {
    where.status = statusFilter;
  }

  const tickets = await prisma.ticket.findMany({
    where,
    include: { guild: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-bg-void text-white">
      <SiteHeader />

      <main className="pt-24 container mx-auto px-6 py-12">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="font-display text-3xl font-bold text-white">
            Ticket Archive — {tickets[0]?.guild?.name || guildId}
          </h1>
          <Link
            href={`/${process.env.ADMIN_SECRET_PATH}`}
            className="text-text-dim hover:text-amber-signal font-mono text-sm transition-colors"
          >
            ← Back to Admin Panel
          </Link>
        </div>

        <div className="space-y-4">
          {tickets.length === 0 ? (
            <div className="card-bg rounded-xl p-6 text-center text-text-dim">
              No tickets found for this filter.
            </div>
          ) : (
            tickets.map((ticket) => (
              <AdminTicketList key={ticket.id} ticket={ticket} />
            ))
          )}
        </div>
      </main>
    </div>
  );
}

export const revalidate = 0;
