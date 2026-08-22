"use client";

import { Guild, Ticket } from "@/generated/prisma/client";

interface Props {
  stats: {
    totalUsers: number;
    totalGuilds: number;
    totalTickets: number;
    openTickets: number;
    totalGiveaways: number;
    recentTickets: (Ticket & { guild: Guild })[];
  };
}

export function AdminStatsCards({ stats }: Props) {
  const cards = [
    { label: "Total Users", value: stats.totalUsers, color: "amber-signal" },
    { label: "Total Guilds", value: stats.totalGuilds, color: "violet-deep" },
    { label: "Total Tickets", value: stats.totalTickets, color: "text-blue-400" },
    { label: "Open Tickets", value: stats.openTickets, color: "text-green-400" },
    { label: "Active Giveaways", value: stats.totalGiveaways, color: "text-orange-400" },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
      {cards.map((card) => (
        <div key={card.label} className="card-bg rounded-xl p-4 text-center">
          <p className="text-text-dim text-xs font-mono mb-1">{card.label}</p>
          <p className={`font-display text-3xl font-bold ${card.color}`}>
            {card.value}
          </p>
        </div>
      ))}
    </div>
  );
}
