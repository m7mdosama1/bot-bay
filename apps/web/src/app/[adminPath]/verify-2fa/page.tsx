import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { verifyTotpAndCreateSession, isAdminAllowlisted, checkFailedAttempts } from "@/lib/adminAuth";
import { SiteHeader } from "@/components/layout/SiteHeader";

export default async function AdminVerify2FAPage({
  params,
  searchParams,
}: {
  params: Promise<{ adminPath: string }>;
  searchParams?: Promise<{ callbackUrl?: string }>;
}) {
  const { adminPath } = await params;
  const sp = await searchParams;

  if (adminPath !== process.env.ADMIN_SECRET_PATH) {
    notFound();
  }

  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect("/login");
  }

  const userId = session.user.id;

  if (!isAdminAllowlisted(userId)) {
    notFound();
  }

  const callbackUrl = sp?.callbackUrl || `/${process.env.ADMIN_SECRET_PATH}`;
  const rateLimit = checkFailedAttempts(userId);

  return (
    <div className="min-h-screen bg-bg-void text-white">
      <SiteHeader />

      <main className="pt-24 container mx-auto px-6 py-12 max-w-md">
        <div className="card-bg rounded-xl p-8">
          <h1 className="font-display text-2xl font-bold text-white mb-2">
            Two-Factor Authentication
          </h1>
          <p className="text-text-dim text-sm mb-6">
            Enter your TOTP code to verify admin access.
          </p>

          {rateLimit.locked && (
            <div className="bg-red-500/20 border border-red-500 rounded-xl p-3 mb-4">
              <p className="text-red-400 text-sm font-mono">
                Too many failed attempts. Try again later.
              </p>
            </div>
          )}

          <form action={async (formData) => {
            "use server";
            const token = formData.get("token") as string;
            const result = verifyTotpAndCreateSession(userId, token);

            if (result.success) {
              redirect(callbackUrl);
            } else {
              // Fall through to show error
              redirect(`/${process.env.ADMIN_SECRET_PATH}/verify-2fa?error=${encodeURIComponent(result.error || "Invalid code")}&callbackUrl=${encodeURIComponent(callbackUrl)}`);
            }
          }} className="space-y-4">
            <div>
              <label className="block text-xs text-text-dim font-mono mb-1">
                TOTP Code
              </label>
              <input
                type="text"
                name="token"
                maxLength={6}
                minLength={6}
                pattern="[0-9]{6}"
                required
                className="w-full px-4 py-3 bg-bg-raised border border-line rounded-xl text-white font-mono text-center text-2xl focus:outline-none focus:border-amber-signal transition-colors"
                placeholder="000000"
                autoFocus
              />
            </div>

            <button
              type="submit"
              className="w-full btn btn-primary btn-lg rounded-xl font-mono text-sm"
              disabled={rateLimit.locked}
            >
              Verify &amp; Continue
            </button>

            <Link
              href={callbackUrl}
              className="block text-center text-sm text-text-dim hover:text-text transition-colors font-mono"
            >
              ← Back
            </Link>
          </form>
        </div>
      </main>
    </div>
  );
}

export const revalidate = 0;
