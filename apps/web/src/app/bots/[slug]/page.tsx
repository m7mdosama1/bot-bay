import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { useMemo } from "react";

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

type BotDetail = Bot & {
  botDetails: {
    commands: string[];
    commandCategories: { name: string; commands: string[]; icon: string }[];
    steps: { title: string; description: string }[];
    faqs: { question: string; answer: string }[];
    permissionReason: string;
    testimonial: { name: string; role: string; content: string };
  };
} | null;

type NonNullBotDetail = NonNullable<BotDetail>;

const botDetailsMap: Record<string, NonNullBotDetail["botDetails"]> = {
  verification: {
    commands: ["/verify-setup", "/verify-config", "/verify-check", "/verify-reset"],
    commandCategories: [
      {
        name: "Setup",
        icon: "⚙️",
        commands: ["/verify-setup", "/verify-config"],
      },
      {
        name: "Moderation",
        icon: "🛡️",
        commands: ["/verify-reset", "/verify-whitelist"],
      },
    ],
    steps: [
      {
        title: "Configure Verification",
        description:
          "Run /verify-setup in your Discord server to designate a verification channel and assign roles for verified and unverified users.",
      },
      {
        title: "Set Protection Options",
        description:
          "Customize VPN detection, alt-account age limits, and IP reputation thresholds to match your server's security requirements.",
      },
      {
        title: "Users Verify Automatically",
        description:
          "New members are prompted to verify on join. The bot checks account age, IP reputation, and VPN status instantly.",
      },
    ],
    faqs: [
      {
        question: "How does the alt account detection work?",
        answer:
          "We check the Discord account creation date against your configured minimum age threshold. Accounts younger than the threshold are flagged automatically.",
      },
      {
        question: "Is VPN detection accurate?",
        answer:
          "We use dual-layer detection via IPQualityScore and ProxyCheck.io APIs for 99.7% accuracy on residential and datacenter proxies.",
      },
      {
        question: "Can I customize the verification flow?",
        answer:
          "Yes — you can toggle VPN checks, alt-account checks, set role names, customize messages, and configure cooldown periods.",
      },
    ],
    permissionReason:
      "Bot needs Manage Roles to assign/unassign verified roles, Read Messages/View Channels to interact with users, and Send Messages for prompts.",
    testimonial: {
      name: "Alex Chen",
      role: "Server Owner • 50k members",
      content:
        "Sentinel Verify cut our alt-account problem by 90%. The dual-layer VPN detection is incredibly effective.",
    },
  },
  giveaway: {
    commands: ["/giveaway-create", "/giveaway-end", "/giveaway-reroll", "/giveaway-list"],
    commandCategories: [
      {
        name: "Management",
        icon: "🎁",
        commands: ["/giveaway-create", "/giveaway-end", "/giveaway-reroll", "/giveaway-list"],
      },
    ],
    steps: [
      {
        title: "Create a Giveaway",
        description:
          "Use /giveaway-create to launch a giveaway in seconds. Specify prize, winner count, and duration using simple syntax like '24h' or '3d 12h'.",
      },
      {
        title: "Users Enter Automatically",
        description:
          "Participants react with 🎉 to enter. The bot tracks entries in real-time with anti-spam protection enabled by default.",
      },
      {
        title: "Winners Are Selected",
        description:
          "When the timer ends, winners are chosen automatically and notified via DM. Use /giveaway-reroll to pick new winners if needed.",
      },
    ],
    faqs: [
      {
        question: "Can I set different entry requirements?",
        answer:
          "Yes — you can require users to have a specific role, be a member for a minimum time, or pass our anti-spam filter before they can enter.",
      },
      {
        question: "What happens if nobody enters?",
        answer:
          "The giveaway ends with no winners. You can manually reroll a new draw at any time using /giveaway-reroll.",
      },
      {
        question: "Can I run multiple giveaways at once?",
        answer:
          "Absolutely. Each giveaway runs independently with its own message, countdown, and winners.",
      },
    ],
    permissionReason:
      "Bot needs Send Messages for embeds, Read Message History for reaction tracking, and Manage Messages for cleanup.",
    testimonial: {
      name: "Samira Khalid",
      role: "Community Manager • Gaming Hub",
      content:
        "Bounty Drop runs giveaways flawlessly. The automatic winner selection saves us hours every week.",
    },
  },
  roulette: {
    commands: ["/roulette-setup", "/roulette-bet", "/roulette-bonus", "/roulette-history"],
    commandCategories: [
      {
        name: "Gameplay",
        icon: "🎰",
        commands: ["/roulette-bet", "/roulette-history", "/roulette-leaderboard"],
      },
      {
        name: "Admin",
        icon: "⚙️",
        commands: ["/roulette-setup", "/roulette-bonus", "/roulette-reset"],
      },
    ],
    steps: [
      {
        title: "Configure Your Table",
        description:
          "Run /roulette-setup to set min/max bets, currency name, and enable/disable the table for your server.",
      },
      {
        title: "Players Place Bets",
        description:
          "Users open the roulette interface, select colors/numbers, and enter bet amounts via a modal. Daily bonuses keep engagement high.",
      },
      {
        title: "Watch the Wheel Spin",
        description:
          "When time expires, the wheel animates to a stop. Winners are announced and balances updated instantly.",
      },
    ],
    faqs: [
      {
        question: "What's the max bet limit?",
        answer:
          "You can set custom min and max bet amounts in /roulette-setup. Default is 10–1000 per spin.",
      },
      {
        question: "How often can users claim a daily bonus?",
        answer:
          "Once every 24 hours. Bonus amounts can be customized per server.",
      },
      {
        question: "Is gambling involved?",
        answer:
          "This is a game of chance with virtual currency only — no real money transactions are supported.",
      },
    ],
    permissionReason:
      "Bot needs Send Messages for embeds, Embed Links for rich previews, and Read Message History for game state.",
    testimonial: {
      name: "Yuki Tanaka",
      role: "Server Admin • Anime Community",
      content:
        "Fortune Wheel brought our community together with its interactive roulette. Daily bonuses keep users coming back.",
    },
  },
  admin: {
    commands: ["/ban", "/kick", "/mute", "/warn", "/modlog", "/slowmode"],
    commandCategories: [
      {
        name: "Punishment",
        icon: "⚖️",
        commands: ["/ban", "/kick", "/mute", "/warn"],
      },
      {
        name: "Logging",
        icon: "📋",
        commands: ["/modlog", "/case", "/logs-setup"],
      },
    ],
    steps: [
      {
        title: "Configure Logging",
        description:
          "Set up a moderation log channel with /logs-setup. All actions (bans, kicks, mutes, warns) are recorded permanently.",
      },
      {
        title: "Take Action",
        description:
          "Use slash commands like /ban or /mute. The bot prompts for confirmation before executing, preventing accidental actions.",
      },
      {
        title: "Review History",
        description:
          "View any user's moderation history with /modlog and export logs as CSV for review or appeals.",
      },
    ],
    faqs: [
      {
        question: "Are moderation logs permanent?",
        answer:
          "Yes, all moderation actions are stored in the database permanently. You can view and search them anytime.",
      },
      {
        question: "Can I customize warning thresholds?",
        answer:
          "Yes — configure auto-mute after X warnings, custom ban reasons, and log visibility per role.",
      },
      {
        question: "Does the bot auto-moderate?",
        answer:
          "Optional auto-moderation can be enabled for spam, caps, links, and keyword filtering with custom thresholds.",
      },
    ],
    permissionReason:
      "Bot needs Administrator equivalent (Ban Members, Kick Members, Moderate Members, Manage Messages) for full moderation capability.",
    testimonial: {
      name: "Marcus Rivera",
      role: "Guild Leader • 500+ servers",
      content:
        "Iron Gavel's confirmation flow prevents accidents. The permanent mod logs saved us during a cross-server incident.",
    },
  },
  welcome: {
    commands: ["/welcome-setup", "/welcome-message", "/welcome-role", "/welcome-reset"],
    commandCategories: [
      {
        name: "Configuration",
        icon: "⚙️",
        commands: ["/welcome-setup", "/welcome-message", "/welcome-role"],
      },
    ],
    steps: [
      {
        title: "Create Welcome Flow",
        description:
          "Run /welcome-setup to designate a private welcome channel per member, set custom messages, and assign roles.",
      },
      {
        title: "Members See Rules",
        description:
          "New members are placed in a private channel with your server rules and agreement button — no public role until accepted.",
      },
      {
        title: "Auto-Cleanup",
        description:
          "Once the member accepts the rules, they're assigned roles, the private channel is deleted, and their info is logged.",
      },
    ],
    faqs: [
      {
        question: "Can I customize the welcome message?",
        answer:
          "Yes — use /welcome-message to set custom text with variables like {user}, {server}, and {member_count}.",
      },
      {
        question: "What happens if a user doesn't accept?",
        answer:
          "The channel auto-deletes after 5 minutes (configurable) and the user keeps their default role until they return.",
      },
      {
        question: "Can I set a timeout for rule acceptance?",
        answer:
          "Yes — configure the timeout duration in /welcome-setup. Default is 5 minutes.",
      },
    ],
    permissionReason:
      "Bot needs Manage Channels to create/delete private welcome channels, Manage Roles for role assignment, and Send Messages for prompts.",
    testimonial: {
      name: "Sofia Martinez",
      role: "Server Owner • 12k members",
      content:
        "Threshold eliminated our rule-skipping problem. The private welcome channel ensures every new member sees the rules before joining.",
    },
  },
  ticket: {
    commands: ["/ticket-create", "/ticket-close", "/ticket-claim", "/ticket-transcript"],
    commandCategories: [
      {
        name: "Ticket Management",
        icon: "🎫",
        commands: ["/ticket-create", "/ticket-close", "/ticket-claim", "/ticket-transcript"],
      },
      {
        name: "Admin",
        icon: "⚙️",
        commands: ["/ticket-setup", "/ticket-category", "/ticket-panel"],
      },
    ],
    steps: [
      {
        title: "Set Up Ticket Panel",
        description:
          "Run /ticket-panel to deploy an interactive button panel in your support channel. Users click to open tickets.",
      },
      {
        title: "Users Open Tickets",
        description:
          "Each user gets a private ticket channel. Buttons for claim, close, and transcript are always visible in the channel header.",
      },
      {
        title: "Support Team Responds",
        description:
          "Staff claim tickets with a button click, respond inline, and close when resolved. Transcripts are auto-saved to the database.",
      },
    ],
    faqs: [
      {
        question: "Are transcripts saved permanently?",
        answer:
          "Yes — all transcript content is stored in the database and can be retrieved from the admin dashboard even after channel deletion.",
      },
      {
        question: "Can I set ticket limits per user?",
        answer:
          "Yes — configure maximum open tickets per user and cooldown periods in /ticket-setup.",
      },
      {
        question: "What happens when a ticket is closed?",
        answer:
          "The channel is deleted (configurable), a transcript is saved, and the user receives a DM summary with a link to view it.",
      },
    ],
    permissionReason:
      "Bot needs Manage Channels to create/delete ticket channels, Send Messages for interactions, and Read Message History for transcripts.",
    testimonial: {
      name: "David Kim",
      role: "Community Lead • Creator Hub",
      content:
        "Deskline's transcript archiving solved our support visibility problem. We can review any closed ticket from the dashboard.",
    },
  },
};

function getBotEmoji(slug: string): string {
  const emojis: Record<string, string> = {
    verification: "🛡️",
    giveaway: "🎁",
    roulette: "🎰",
    admin: "⚖️",
    welcome: "👋",
    ticket: "🎫",
  };
  return emojis[slug] || "🤖";
}

function permissionLabels(permissions: string): string[] {
  if (permissions === "8") return ["Administrator"];
  const perms: string[] = [];
  const p = parseInt(permissions);
  if (p & 0x1) perms.push("Create Invites");
  if (p & 0x2) perms.push("Kick Members");
  if (p & 0x4) perms.push("Ban Members");
  if (p & 0x10) perms.push("Manage Channels");
  if (p & 0x100000) perms.push("Add Reactions");
  if (p & 0x4000000) perms.push("Moderate Members");
  if (p & 0x8000000) perms.push("Create Polls");
  if (p & 0x20000000) perms.push("Send Messages");
  if (p & 0x40000000) perms.push("Embed Links");
  if (perms.length === 0) perms.push("Standard Permissions");
  return perms;
}

export default async function BotDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let bot: BotDetail;
  try {
    bot = (await prisma.bot.findUnique({
      where: { slug },
    })) as BotDetail;
  } catch (error) {
    console.error("Failed to fetch bot:", error);
    notFound();
  }

  if (!bot || !bot.isActive) {
    notFound();
  }

  const features = JSON.parse(bot.features) as string[];
  const accentColor = bot.colorAccent;
  const emoji = getBotEmoji(bot.slug);
  const details = botDetailsMap[bot.slug];
  const addUrl = `https://discord.com/api/oauth2/authorize?client_id=${bot.clientId}&permissions=${bot.permissions}&scope=bot%20applications.commands`;
  const permLabels = permissionLabels(bot.permissions);

  return (
    <div className="min-h-screen bg-bg-void text-text pt-20">
      <SiteHeader />

      <div className="container mx-auto px-6 py-12 max-w-6xl">
        {/* Hero Section */}
        <section className="mb-16">
          <div className="rounded-2xl bg-card-bg border-2 p-8 md:p-12" style={{ borderColor: accentColor + "40" }}>
            <div className="flex flex-col md:flex-row items-start md:items-center gap-8">
              <div
                className="w-24 h-24 rounded-2xl flex items-center justify-center text-4xl flex-shrink-0"
                style={{
                  backgroundColor: accentColor + "20",
                  borderColor: accentColor,
                  borderWidth: 2,
                  borderStyle: "solid",
                }}
              >
                {emoji}
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="font-display text-3xl md:text-4xl font-bold text-white">{bot.name}</h1>
                  <span className="text-3xl">{emoji}</span>
                </div>
                <p className="text-lg text-text-dim mb-4">{bot.tagline}</p>
                <p className="text-text leading-relaxed mb-4">{bot.description}</p>
                <div className="flex flex-wrap gap-2">
                  {permLabels.map((p, i) => (
                    <span
                      key={i}
                      className="text-xs px-3 py-1 rounded-full bg-bg-raised border border-line text-text-dim font-mono"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3 flex-shrink-0">
                <a
                  href={addUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary btn-lg rounded-xl font-mono text-sm tracking-wider whitespace-nowrap"
                >
                  Add {bot.name} to Server
                </a>
                <Link
                  href="/dashboard"
                  className="btn btn-ghost btn-md rounded-xl font-mono text-sm whitespace-nowrap"
                >
                  Configure in Dashboard
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Cards */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
          {[
            { label: "Commands", value: details?.commands.length || 4 },
            { label: "Uptime", value: "99.9%" },
            { label: "Active Servers", value: "1,200+" },
            { label: "Response Time", value: "<50ms" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="text-center p-4 rounded-xl bg-card-bg border border-line"
            >
              <p
                className="font-display text-2xl font-bold"
                style={{ color: accentColor }}
              >
                {stat.value}
              </p>
              <p className="text-xs text-text-dim font-mono">{stat.label}</p>
            </div>
          ))}
        </section>

        {/* Features Showcase */}
        <section className="mb-16">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-white mb-6">Key Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <div
                key={i}
                className="p-5 rounded-xl bg-bg-raised border border-line transition-all duration-300 hover:border-amber-signal hover:scale-[1.02]"
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
                  style={{ backgroundColor: accentColor + "20", color: accentColor }}
                >
                  <span>✓</span>
                </div>
                <p className="text-sm text-text leading-relaxed">{feature}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How It Works */}
        {details && (
          <section className="mb-16">
            <h2 className="font-display text-2xl md:text-3xl font-bold text-white mb-6">How It Works</h2>
            <div className="space-y-6">
              {details.steps.map((step, i) => (
                <div key={step.title} className="flex gap-4">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-display font-bold text-sm"
                    style={{ backgroundColor: accentColor + "20", color: accentColor }}
                  >
                    {i + 1}
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-white mb-1">{step.title}</h3>
                    <p className="text-text-dim text-sm leading-relaxed">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Command Categories */}
        {details && (
          <section className="mb-16">
            <h2 className="font-display text-2xl md:text-3xl font-bold text-white mb-6">Commands & Categories</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {details.commandCategories.map((cat) => (
                <div
                  key={cat.name}
                  className="p-6 rounded-xl bg-card-bg border border-line"
                >
                  <h3 className="font-display text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <span>{cat.icon}</span> {cat.name}
                  </h3>
                  <ul className="space-y-1">
                    {cat.commands.map((cmd) => (
                      <li key={cmd}>
                        <code className="text-xs font-mono text-amber-signal bg-bg-raised px-2 py-1 rounded">
                          {cmd}
                        </code>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Permissions */}
        {details && (
          <section className="mb-16">
            <h2 className="font-display text-2xl md:text-3xl font-bold text-white mb-6">Required Permissions</h2>
            <div
              className="rounded-xl p-6 bg-bg-raised border border-line"
              style={{ borderColor: accentColor + "30" }}
            >
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
                {permLabels.map((p, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: accentColor }} />
                    <span className="text-sm text-text-dim">{p}</span>
                  </div>
                ))}
              </div>
              <p className="text-sm text-text-dim mt-4">{details.permissionReason}</p>
            </div>
          </section>
        )}

        {/* FAQ */}
        {details && (
          <section className="mb-16">
            <h2 className="font-display text-2xl md:text-3xl font-bold text-white mb-6">Frequently Asked Questions</h2>
            <div className="space-y-4">
              {details.faqs.map((faq, i) => (
                <div key={i} className="rounded-xl bg-card-bg border border-line p-5">
                  <h3 className="font-display font-semibold text-white mb-2">{faq.question}</h3>
                  <p className="text-sm text-text-dim leading-relaxed">{faq.answer}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Testimonial */}
        {details && (
          <section className="mb-16">
            <div className="rounded-2xl bg-card-bg border border-line p-8">
              <blockquote className="text-xl md:text-2xl text-white italic mb-4 leading-relaxed">
                "{details.testimonial.content}"
              </blockquote>
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: accentColor + "20", color: accentColor }}
                >
                  {details.testimonial.name.charAt(0)}
                </div>
                <div>
                  <p className="font-display font-semibold text-white">{details.testimonial.name}</p>
                  <p className="text-sm text-text-dim">{details.testimonial.role}</p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Final CTA */}
        <section className="text-center py-12">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-white mb-4">
            Ready to supercharge your server?
          </h2>
          <p className="text-text-dim mb-6">
            Add {bot.name} to your Discord server in one click.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={addUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary btn-lg rounded-full font-mono text-sm tracking-wider"
            >
              Add {bot.name} to Server
            </a>
            <Link
              href="/bots"
              className="btn btn-ghost btn-lg rounded-full font-mono text-sm"
            >
              View All Bots
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
