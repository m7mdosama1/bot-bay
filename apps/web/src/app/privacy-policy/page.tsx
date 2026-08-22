import Link from "next/link";
import { SiteHeader } from "@/components/layout/SiteHeader";

export const metadata = {
  title: "Privacy Policy | Bot Bay",
  description: "Bot Bay Privacy Policy — how we collect, use, and protect your data.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-bg-void text-text">
      <SiteHeader />

      <main className="pt-24 container mx-auto px-6 py-12 max-w-3xl">
        <h1 className="font-display text-4xl font-bold gradient-text mb-8">
          Privacy Policy
        </h1>

        <div className="prose prose-invert max-w-none space-y-8 text-text-dim font-sans">
          <p>
            Last updated: August 22, 2026
          </p>

          <div className="space-y-4">
            <h2 className="font-display text-xl font-semibold text-text">1. Overview</h2>
            <p>
              Bot Bay ("we", "us", or "our") operates the Bot Bay platform (the "Service"),
              which provides Discord bot management, dashboards, and administrative tools.
              This Privacy Policy describes how we collect, use, and protect your information
              when you use our Service.
            </p>
            <p>
              By accessing or using the Service, you agree to this Privacy Policy. If you
              do not agree with the terms, please do not use the Service.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="font-display text-xl font-semibold text-text">2. Information We Collect</h2>
            <h3 className="font-display text-lg font-medium text-text">Personal Data</h3>
            <p>
              We collect information you provide directly to us, including:
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Discord Account Information</strong> — When you sign in via Discord OAuth, we receive your Discord user ID, username, avatar, and email (if available). We do not store your Discord password.</li>
              <li><strong>Profile Data</strong> — Information you include in your profile, such as display preferences.</li>
              <li><strong>Guild Information</strong> — Basic server information (name, icon) when you link a server to manage bots. We only store IDs and names, not server secrets.</li>
            </ul>

            <h3 className="font-display text-lg font-medium text-text">Usage Data</h3>
            <p>
              We automatically collect information about your interaction with the Service:
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Log Data</strong> — IP address, browser type, operating system, referring URLs, and timestamps.</li>
              <li><strong>Cookies and Tracking</strong> — We use essential cookies for authentication and preferences. See our Cookie Policy for details.</li>
              <li><strong>Bot Commands</strong> — We may log moderation actions and ticket interactions for record-keeping purposes.</li>
            </ul>
          </div>

          <div className="space-y-4">
            <h2 className="font-display text-xl font-semibold text-text">3. How We Use Your Information</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>To provide and maintain the Service</li>
              <li>To authenticate your account and manage sessions</li>
              <li>To communicate with you about updates, security alerts, and support requests</li>
              <li>To analyze usage patterns and improve the Service</li>
              <li>To comply with legal obligations</li>
            </ul>
          </div>

          <div className="space-y-4">
            <h2 className="font-display text-xl font-semibold text-text">4. Data Sharing and Disclosure</h2>
            <p>
              We do not sell, trade, or rent your personal information to third parties. We may share
              information only in the following circumstances:
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Service Providers</strong> — Third-party vendors who assist us in operating the Service (e.g., Discord for OAuth).</li>
              <li><strong>Legal Compliance</strong> — When required by law or to protect our rights and safety.</li>
              <li><strong>Business Transfers</strong> — In connection with a merger, acquisition, or sale of assets, your data will remain subject to this Privacy Policy.</li>
            </ul>
          </div>

          <div className="space-y-4">
            <h2 className="font-display text-xl font-semibold text-text">5. Data Retention</h2>
            <p>
              We retain personal information for as long as necessary to provide the Service and for
              legitimate business purposes. Discord OAuth sessions expire according to NextAuth
              configuration. Bot interaction logs are retained for 30 days for debugging purposes.
            </p>
            <p>
              You may request deletion of your account data by contacting us. Note that some
              information may be retained for legal compliance or security purposes.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="font-display text-xl font-semibold text-text">6. Data Security</h2>
            <p>
              We take reasonable measures to protect your information from unauthorized access,
              alteration, disclosure, or destruction. These include encryption at rest, secure
              authentication, and access controls. However, no method of transmission over the
              internet is completely secure, and we cannot guarantee absolute security.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="font-display text-xl font-semibold text-text">7. International Data Transfers</h2>
            <p>
              Your information may be transferred to and processed in countries other than your
              country of residence, including countries that may have different data protection laws.
              By using the Service, you consent to such transfers.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="font-display text-xl font-semibold text-text">8. Children's Privacy</h2>
            <p>
              The Service is not intended for individuals under the age of 13 (or the applicable age
              of digital consent in your jurisdiction). We do not knowingly collect personal
              information from children.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="font-display text-xl font-semibold text-text">9. Your Rights</h2>
            <p>
              Depending on your location, you may have the right to:
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>Access and obtain a copy of your personal data</li>
              <li>Rectify inaccurate or incomplete data</li>
              <li>Delete your data</li>
              <li>Restrict or object to processing</li>
              <li>Data portability</li>
              <li>Withdraw consent at any time</li>
            </ul>
            <p>
              To exercise these rights, please contact us at the email provided below.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="font-display text-xl font-semibold text-text">10. Third-Party Services</h2>
            <p>
              The Service may contain links to third-party websites or services that we do not own
              or control (e.g., Discord OAuth, IPQualityScore, ProxyCheck.io). We are not responsible
              for the content, privacy policies, or practices of any third-party services.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="font-display text-xl font-semibold text-text">11. Changes to This Privacy Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any changes
              by posting the new Privacy Policy on this page with an updated "Last updated" date.
              Your continued use of the Service after any modifications constitutes acceptance of the
              updated policy.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="font-display text-xl font-semibold text-text">12. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us:
            </p>
            <p>
              Email: privacy@bot-bay.com<br />
              Discord: discord.gg/botbay
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
