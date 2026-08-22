import Link from "next/link";
import { SiteHeader } from "@/components/layout/SiteHeader";

export const metadata = {
  title: "Terms of Service | Bot Bay",
  description: "Bot Bay Terms of Service — terms and conditions for using our platform.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-bg-void text-text">
      <SiteHeader />

      <main className="pt-24 container mx-auto px-6 py-12 max-w-3xl">
        <h1 className="font-display text-4xl font-bold gradient-text mb-8">
          Terms of Service
        </h1>

        <div className="prose prose-invert max-w-none space-y-8 text-text-dim font-sans">
          <p>
            Last updated: August 22, 2026
          </p>

          <div className="space-y-4">
            <h2 className="font-display text-xl font-semibold text-text">1. Acceptance of Terms</h2>
            <p>
              By accessing or using Bot Bay ("the Service"), you agree to be bound by these Terms
              of Service. If you do not agree with any part of these terms, you may not use the Service.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="font-display text-xl font-semibold text-text">2. Eligibility</h2>
            <p>
              You must be at least 13 years old (or the age of digital consent in your jurisdiction,
              whichever is higher) to use the Service. By using the Service, you represent and warrant
              that you meet these requirements.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="font-display text-xl font-semibold text-text">3. User Responsibilities</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
              <li>You must comply with Discord's Terms of Service when using our bots.</li>
              <li>You may not use the Service for any unlawful or prohibited activity.</li>
              <li>You must have proper permissions before adding bots to Discord servers you do not own.</li>
            </ul>
          </div>

          <div className="space-y-4">
            <h2 className="font-display text-xl font-semibold text-text">4. Bot Usage</h2>
            <p>
              Our bots are provided "as is" without warranties of any kind. We are not responsible
              for any damages, data loss, or disruptions caused by bot usage. You agree to use the
              bots at your own risk.
            </p>
            <p>
              We reserve the right to modify, suspend, or discontinue any bot or feature at any time
              without notice.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="font-display text-xl font-semibold text-text">5. Intellectual Property</h2>
            <p>
              All content, logos, and assets on Bot Bay are the property of their respective owners.
              You may not use, reproduce, or distribute any content without prior written permission.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="font-display text-xl font-semibold text-text">6. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, Bot Bay shall not be liable for any indirect,
              incidental, special, consequential, or punitive damages, or any loss of data or use,
              arising out of or in connection with your use of the Service.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="font-display text-xl font-semibold text-text">7. Governing Law</h2>
            <p>
              These Terms are governed by the laws of the jurisdiction in which Bot Bay operates,
              without regard to conflict of law principles.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="font-display text-xl font-semibold text-text">8. Changes to Terms</h2>
            <p>
              We may revise these Terms at any time. Revisions are effective upon posting. Your
              continued use of the Service after any changes constitutes acceptance of the new terms.
            </p>
          </div>

          <div className="pt-8 border-t border-line">
            <p>
              By using Bot Bay, you acknowledge that you have read, understood, and agree to be bound
              by these Terms of Service.
            </p>
          </div>
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
