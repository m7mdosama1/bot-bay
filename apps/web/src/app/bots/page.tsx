import { prisma } from "@/lib/prisma";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { BotGrid } from "@/components/bots/BotGrid";

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

async function getActiveBots(): Promise<Bot[]> {
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

export const metadata = {
  title: "Browse Bots | Bot Bay",
  description: "Browse all available Discord bots on Bot Bay.",
};

export default async function BrowseBotsPage() {
  const bots = await getActiveBots();

  return (
    <div className="min-h-screen bg-bg-void text-text">
      <SiteHeader />

      <main className="pt-20 container mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h1 className="font-display text-4xl md:text-5xl font-bold text-white mb-4">
            Browse Bots
          </h1>
          <p className="text-text-dim text-lg max-w-2xl mx-auto">
            Six specialized bots to supercharge your Discord server.
            Each bot is designed for a specific purpose with professional-grade features.
          </p>
        </div>

        <BotGrid bots={bots} />
      </main>
    </div>
  );
}

export const revalidate = 0;
