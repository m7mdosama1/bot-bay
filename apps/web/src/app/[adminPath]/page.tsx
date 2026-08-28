import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import { notFound } from "next/navigation";
import { verifyAdminSession, getAdminStats, isAdminAllowlisted } from "@/lib/adminAuth";
import {
  getAllBotsForAdmin,
  getAllGuildsForAdmin,
  getAllGlobalTickets,
} from "@/lib/prisma";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { AdminControlCenter } from "@/components/admin/AdminControlCenter";

export default async function AdminPanelPage({
  params,
}: {
  params: Promise<{ adminPath: string }>;
}) {
  const { adminPath } = await params;

  if (adminPath !== process.env.ADMIN_SECRET_PATH) {
    notFound();
  }

  const session = await getServerSession(authOptions);

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
          <h1 className="font-display text-4xl font-bold text-red-500 mb-4">
            🚫 Access Denied
          </h1>
          <p className="text-text-dim mb-6 font-mono text-sm">
            Your Discord ID ({userId}) is not authorized to access the super admin panel.
          </p>
        </main>
      </div>
    );
  }

  // Verify admin session (with TOTP)
  const adminSession = await verifyAdminSession(userId, session.accessToken as string);

  if (!adminSession.authenticated) {
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

  // Fetch complete admin data
  const [stats, bots, guilds, tickets] = await Promise.all([
    getAdminStats(),
    getAllBotsForAdmin(),
    getAllGuildsForAdmin(),
    getAllGlobalTickets(30),
  ]);

  return (
    <div className="min-h-screen bg-bg-void text-white">
      <SiteHeader />

      <main className="pt-24 container mx-auto px-6 py-12 max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl md:text-4xl font-extrabold text-white mb-2">
              🛡️ Super Admin Control Center
            </h1>
            <p className="text-text-dim text-sm">
              إدارة المنصة الشاملة، مراقبة البوتات، السيرفرات، والتذاكر المركزية
            </p>
          </div>
          <Link
            href="/"
            className="text-text-dim hover:text-amber-signal font-mono text-sm transition-colors"
          >
            ← العودة للموقع
          </Link>
        </div>

        <AdminControlCenter
          adminPath={adminPath}
          stats={stats}
          bots={bots as any}
          guilds={guilds as any}
          tickets={tickets as any}
        />
      </main>
    </div>
  );
}

export const revalidate = 0;
