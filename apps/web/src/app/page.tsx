import { prisma } from "@/lib/prisma";
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
    return await prisma.bot.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    });
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
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
          <div className="absolute inset-0 z-0">
            <Suspense fallback={null}>
              <HeroThreeScene />
            </Suspense>
          </div>

          <div className="relative z-20 container mx-auto px-6 py-24 text-center">
            <div className="space-y-8 max-w-5xl mx-auto">
              <div>
                <h1 className="font-display text-6xl md:text-7xl lg:text-8xl font-extrabold tracking-tight text-white mb-4">
                  <span className="gradient-text">BOT BAY</span>
                </h1>
                <p className="text-xl md:text-2xl text-text-dim max-w-3xl mx-auto leading-relaxed">
                  Your complete Discord bot ecosystem — verification, giveaways,
                  moderation, tickets, and more. All in one professional platform.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/login"
                  className="btn btn-primary btn-lg rounded-full font-mono text-sm tracking-wider"
                >
                  Access Dashboard
                </Link>
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
                Six specialized bots to supercharge your Discord server
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
