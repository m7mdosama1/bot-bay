import { getActiveBots } from "@/lib/prisma";
import { Suspense } from "react";
import Link from "next/link";
import { BotGrid } from "@/components/bots/BotGrid";
import { HeroThreeScene } from "@/components/hero/HeroThreeScene";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Testimonials } from "@/components/Testimonials";

export const metadata = {
  title: "Bot Bay - Discord Bot Platform",
  description: "A complete platform for Discord bots, dashboards, and admin management.",
};

interface Bot {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  features: string;
  clientId: string;
  permissions: string;
  iconUrl: string | null;
  colorAccent: string;
  isActive: boolean;
}

async function getBots(): Promise<Bot[]> {
  try {
    return await getActiveBots();
  } catch (error) {
    console.error("Failed to fetch bots:", error);
    return [];
  }
}

export default async function HomePage() {
  const bots = await getBots();

  return (
    <>
      <SiteHeader />

      <main>
        <section className="relative overflow-hidden pt-28 pb-24 lg:pt-36">
          <div className="absolute inset-0 z-0 opacity-40">
            <Suspense fallback={null}>
              <HeroThreeScene />
            </Suspense>
          </div>

          <div className="relative z-20 container mx-auto px-6">
            <div className="grid lg:grid-cols-[1.05fr_.95fr] gap-16 items-center">
              <div className="max-w-2xl">
                <p className="eyebrow mb-5">DISCORD OPERATIONS / BOT BAY</p>
                <h1 className="font-display text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-6 leading-[.98]">
                  The control room for your community.
                </h1>
                <p className="text-lg md:text-xl text-text-dim max-w-xl leading-relaxed mb-8">
                  Focused tools for protection, engagement, support, and growth. Configure your server once, then let the bots handle the rhythm.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/login"
                  className="btn btn-primary btn-lg rounded-lg font-mono text-sm tracking-wider"
                >
                  Open dashboard <span aria-hidden="true">↗</span>
                </Link>
                  <Link href="/bots" className="btn btn-ghost btn-lg rounded-lg font-mono text-sm">Explore the stack</Link>
                </div>
                <div className="flex gap-10 mt-12 pt-6 border-t border-line max-w-lg">
                  <div><strong className="block text-2xl font-display text-white">09</strong><span className="text-xs font-mono text-text-dim">SPECIALIST BOTS</span></div>
                  <div><strong className="block text-2xl font-display text-white">24/7</strong><span className="text-xs font-mono text-text-dim">AUTOMATION</span></div>
                  <div><strong className="block text-2xl font-display text-white">01</strong><span className="text-xs font-mono text-text-dim">CONTROL PLANE</span></div>
                </div>
              </div>
              <div className="hero-console" aria-label="Bot Bay product preview">
                <div className="hero-console-bar"><span>BOT BAY / LIVE SYSTEMS</span><i /><i /><i /></div>
                <div className="hero-console-body"><div className="hero-orbit"><span>✦</span></div><div><p className="eyebrow">ACTIVE SIGNAL</p><h2>Everything your server needs, in one considered system.</h2><div className="hero-signal-list"><span><b /> Community safety</span><span><b /> Member engagement</span><span><b /> Server intelligence</span></div></div></div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 bg-bg-raised">
          <div className="container mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="font-display text-4xl font-bold text-white mb-4">
                Available Bots
              </h2>
              <p className="text-text-dim text-lg">
                Nine focused tools, one operating layer
              </p>
            </div>

            <BotGrid bots={bots} />
          </div>
        </section>

        <Testimonials />
      </main>
    </>
  );
}

export const revalidate = 0;