import Link from "next/link";
import { SiteHeader } from "@/components/layout/SiteHeader";

export const metadata = {
  title: "Cookie Policy | Bot Bay",
  description: "Bot Bay Cookie Policy — how we use cookies and tracking technologies.",
};

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen bg-bg-void text-text">
      <SiteHeader />

      <main className="pt-24 container mx-auto px-6 py-12 max-w-3xl">
        <h1 className="font-display text-4xl font-bold gradient-text mb-8">
          Cookie Policy
        </h1>

        <div className="prose prose-invert max-w-none space-y-8 text-text-dim font-sans">
          <p>
            Last updated: August 22, 2026
          </p>

          <h2 className="font-display text-xl font-semibold text-text">1. What Are Cookies</h2>
          <p>
            Cookies are small text files stored on your device when you visit websites. We use
            cookies and similar tracking technologies (such as local storage) to enhance your
            experience on Bot Bay.
          </p>

          <h2 className="font-display text-xl font-semibold text-text">2. How We Use Cookies</h2>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Authentication</strong> — Maintain your login session with Discord via NextAuth.</li>
            <li><strong>Preferences</strong> — Remember your display settings and language preferences.</li>
            <li><strong>Analytics</strong> — Understand how visitors interact with the Service (if analytics are enabled).</li>
            <li><strong>Security</strong> — Detect and prevent fraud and unauthorized access.</li>
          </ul>

          <h2 className="font-display text-xl font-semibold text-text">3. Types of Cookies We Use</h2>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Essential Cookies</strong> — Required for core functionality. Cannot be disabled.</li>
            <li><strong>Preference Cookies</strong> — Remember your settings. Optional.</li>
            <li><strong>Session Cookies</strong> — Track your session across requests. Automatically cleared.</li>
          </ul>

          <h2 className="font-display text-xl font-semibold text-text">4. Third-Party Cookies</h2>
          <p>
            We may use third-party services (e.g., Discord OAuth) that may set their own cookies.
            We are not responsible for the cookies set by these services. Please review their
            respective privacy policies.
          </p>

          <h2 className="font-display text-xl font-semibold text-text">5. Managing Your Cookie Preferences</h2>
          <p>
            Most browsers accept cookies by default. You can configure your browser to refuse cookies,
            but this may impact your experience on the Service.
          </p>

          <h2 className="font-display text-xl font-semibold text-text">6. Updates to This Policy</h2>
          <p>
            We may update this Cookie Policy. Changes are effective upon posting.
          </p>
        </div>

        <div className="mt-12 pt-8 border-t border-line">
          <Link
            href="/"
            className="text-sm text-text-dim hover:text-amber-signal transition-colors font-mono"
          >
            ← Back to Home
          </Link>
        </div>
      </main>
    </div>
  );
}
