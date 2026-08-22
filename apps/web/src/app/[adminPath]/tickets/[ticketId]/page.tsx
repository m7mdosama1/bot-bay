import { getServerSession } from "next-auth";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { verifyAdminSession } from "@/lib/adminAuth";
import { TicketTranscriptView } from "@/components/admin/TicketTranscriptView";
import { getTicketById } from "@/lib/prisma";

export default async function AdminTicketDetailPage({
  params,
}: {
  params: Promise<{ adminPath: string; ticketId: string }>;
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const { adminPath, ticketId } = await params;

  if (adminPath !== process.env.ADMIN_SECRET_PATH) {
    notFound();
  }

  const session = await getServerSession();

  const adminSession = await verifyAdminSession(session?.user?.id, session?.accessToken as string);

  if (!adminSession.authenticated) {
    const redirectUrl = `/${process.env.ADMIN_SECRET_PATH}/verify-2fa?callbackUrl=%2F${process.env.ADMIN_SECRET_PATH}%2Ftickets%2F${ticketId}`;
    return (
      <div className="min-h-screen bg-bg-void text-text">
        <SiteHeader />
        <main className="pt-32 container mx-auto px-6 text-center">
          <h1 className="font-display text-4xl font-bold gradient-text mb-4">
            Admin Access Required
          </h1>
          <p className="text-text-dim mb-6">
            You need admin access to view this page.
          </p>
          <Link href={redirectUrl} className="btn btn-primary btn-lg rounded-full font-mono">
            Verify Admin Access
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

  if (!ticket) {
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
