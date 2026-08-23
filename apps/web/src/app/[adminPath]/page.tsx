import { getServerSession } from "next-auth";
import Link from "next/link";
import { notFound } from "next/navigation";
import { verifyAdminSession, getAdminStats, isAdminAllowlisted } from "@/lib/adminAuth";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { AdminStatsCards } from "@/components/admin/AdminStatsCards";

export default async function AdminPanelPage({
  params,
}: {
  params: Promise<{ adminPath: string }>;
}) {
  const { adminPath } = await params;

  if (adminPath !== process.env.ADMIN_SECRET_PATH) {
    notFound();
  }

  const session = await getServerSession();

  // Check if user even has a Discord session first
  if (!session || !session.user) {
    return (
      <div className="min-h-screen bg-bg-void text-white">
        <SiteHeader />
        <main className="pt-32 container mx-auto px-6 text-center">
          <h1 className="font-display text-4xl font-bold gradient-text mb-4">
            Admin Access Required
          </h1>
          <p className="text-text-dim mb-6">
            Please log in with Discord first to access the admin panel.
          </p>
          <Link href="/login" className="btn btn-primary btn-lg rounded-full font-mono">
            Login with Discord
          </Link>
        </main>
      </div>
    );
  }

  const userId = session.user.id;

  if (!userId) {
    return (
      <div className="min-h-screen bg-bg-void text-white">
        <SiteHeader />
        <main className="pt-32 container mx-auto px-6 text-center">
          <h1 className="font-display text-4xl font-bold gradient-text mb-4">
            Session Error
          </h1>
          <p className="text-text-dim mb-6">
            Your session is invalid. Please log in again.
          </p>
          <Link href="/login" className="btn btn-primary btn-lg rounded-full font-mono">
            Login with Discord
          </Link>
        </main>
      </div>
    );
  }

  // Check allowlist
  if (!isAdminAllowlisted(userId)) {
    return (
      <div className="min-h-screen bg-bg-void text-white">
        <SiteHeader />
        <main className="pt-32 container mx-auto px-6 text-center">
          <h1 className="font-display text-4xl font-bold gradient-text mb-4">
            Access Denied
          </h1>
          <p className="text-text-dim mb-6">
            Your Discord ID is not authorized to access the admin panel.
          </p>
        </main>
      </div>
    );
  }

  // Verify admin session (with TOTP)
  const adminSession = await verifyAdminSession(userId, session.accessToken as string);

  if (!adminSession.authenticated) {
    // Redirect to 2FA page
    return (
      <div className="min-h-screen bg-bg-void text-white">
        <SiteHeader />
        <main className="pt-32 container mx-auto px-6 text-center">
          <h1 className="font-display text-4xl font-bold gradient-text mb-4">
            Two-Factor Authentication Required
          </h1>
          <p className="text-text-dim mb-6">
            Enter your TOTP code to access the admin panel.
          </p>
          <Link
            href={`/${process.env.ADMIN_SECRET_PATH}/verify-2fa`}
            className="btn btn-primary btn-lg rounded-full font-mono"
          >
            Enter 2FA Code
          </Link>
        </main>
      </div>
    );
  }

  // Fully authenticated admin - show the dashboard
  const stats = await getAdminStats();

  return (
    <div className="min-h-screen bg-bg-void text-white">
      <SiteHeader />

      <main className="pt-24 container mx-auto px-6 py-12">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-white mb-2">
              Admin Panel
            </h1>
            <p className="text-text-dim">
              Bot Bay administration dashboard
            </p>
          </div>
          <Link
            href="/"
            className="text-text-dim hover:text-amber-signal font-mono text-sm transition-colors"
          >
            ← Back to Site
          </Link>
        </div>

        <AdminStatsCards stats={stats} />

        <div className="mt-8 card-bg rounded-xl p-6">
          <h2 className="font-display text-xl font-bold text-white mb-4">
            Manage Bots
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-line">
                  <th className="text-left py-2 font-mono text-xs text-text-dim">Name</th>
                  <th className="text-left py-2 font-mono text-xs text-text-dim">Slug</th>
                  <th className="text-left py-2 font-mono text-xs text-text-dim">Active</th>
                  <th className="text-left py-2 font-mono text-xs text-text-dim">Actions</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentTickets.length > 0 && (
                  <tr>
                    <td colSpan={4} className="py-2 text-center text-text-dim">
                      <Link
                        href={`/${process.env.ADMIN_SECRET_PATH}/tickets/0`}
                        className="text-amber-signal font-mono text-xs"
                      >
                        View all tickets →
                      </Link>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

export const revalidate = 0;
