import Link from "next/link";
import { SiteHeader } from "@/components/layout/SiteHeader";

export const metadata = {
  title: "About | Bot Bay",
  description: "Learn about Bot Bay — a complete Discord bot platform for communities.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-bg-void text-text">
      <SiteHeader />

      <main className="pt-24 container mx-auto px-6 py-12 max-w-4xl">
        <h1 className="font-display text-4xl md:text-5xl font-bold gradient-text mb-8">
          About Bot Bay
        </h1>

        <div className="space-y-10 text-text-dim font-sans">
          <div>
            <p className="text-lg leading-relaxed">
              Bot Bay is a comprehensive Discord bot ecosystem designed to supercharge your
              community. We provide a suite of specialized bots that handle verification,
              giveaways, moderation, tickets, and more — all managed from a single, professional
              dashboard.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="card-bg rounded-xl p-6 border border-line">
              <h3 className="font-display text-xl font-semibold text-text mb-3">Our Mission</h3>
              <p>
                To empower Discord communities with professional-grade automation tools that are
                easy to use, reliable, and built with security in mind.
              </p>
            </div>
            <div className="card-bg rounded-xl p-6 border border-line">
              <h3 className="font-display text-xl font-semibold text-text mb-3">Our Vision</h3>
              <p>
                A world where every Discord server has access to enterprise-quality bots without
                the complexity of self-hosting and managing multiple independent systems.
              </p>
            </div>
          </div>

          <div>
            <h2 className="font-display text-2xl font-bold text-white mb-4">The Bots</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="card-bg rounded-xl p-4 border border-line">
                <span className="text-2xl mr-2">🛡️</span>
                <strong className="text-text">Sentinel Verify</strong>
                <p className="text-sm text-text-dim mt-1">Anti-alt & VPN verification system</p>
              </div>
              <div className="card-bg rounded-xl p-4 border border-line">
                <span className="text-2xl mr-2">🎁</span>
                <strong className="text-text">Bounty Drop</strong>
                <p className="text-sm text-text-dim mt-1">Automated giveaways with countdown</p>
              </div>
              <div className="card-bg rounded-xl p-4 border border-line">
                <span className="text-2xl mr-2">🎰</span>
                <strong className="text-text">Fortune Wheel</strong>
                <p className="text-sm text-text-dim mt-1">Interactive roulette with betting</p>
              </div>
              <div className="card-bg rounded-xl p-4 border border-line">
                <span className="text-2xl mr-2">⚖️</span>
                <strong className="text-text">Iron Gavel</strong>
                <p className="text-sm text-text-dim mt-1">Moderation toolkit with logging</p>
              </div>
              <div className="card-bg rounded-xl p-4 border border-line">
                <span className="text-2xl mr-2">👋</span>
                <strong className="text-text">Threshold</strong>
                <p className="text-sm text-text-dim mt-1">Welcome channels with rule acceptance</p>
              </div>
              <div className="card-bg rounded-xl p-4 border border-line">
                <span className="text-2xl mr-2">🎫</span>
                <strong className="text-text">Deskline</strong>
                <p className="text-sm text-text-dim mt-1">Persistent ticket system with transcripts</p>
              </div>
            </div>
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
