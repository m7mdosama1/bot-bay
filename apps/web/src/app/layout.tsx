import "./globals.css";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Space_Grotesk } from "next/font/google";
import { ClientProviders } from "@/components/providers/ClientProviders";
import { Footer } from "@/components/layout/Footer";
import { CryptoSupport } from "@/components/CryptoSupport";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
});

export const metadata: {
  title?: string;
  description?: string;
} = {
  title: "Bot Bay - Discord Bot Platform",
  description: "A complete platform for Discord bots, dashboards, and admin management.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en" className={`${spaceGrotesk.variable} h-full`} data-scroll-behavior="smooth">
      <body className="bg-bg-void text-text antialiased font-sans-ar min-h-screen">
        <ClientProviders session={session}>{children}</ClientProviders>
        <CryptoSupport />
        <Footer />
      </body>
    </html>
  );
}
