"use client";

import { Ticket, Guild } from "@/generated/prisma/client";
import Link from "next/link";

interface Props {
  ticket: Ticket & { guild: Guild };
}

export function AdminTicketList({ ticket }: Props) {
  return (
    <div className="card-bg rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-xl font-bold text-white">
          Ticket #{ticket.number}
        </h2>
        <span
          className={`text-xs font-mono px-2 py-1 rounded ${
            ticket.status === "open"
              ? "bg-green-500/20 text-green-400"
              : ticket.status === "claimed"
              ? "bg-yellow-500/20 text-yellow-400"
              : "bg-gray-500/20 text-gray-400"
          }`}
        >
          {ticket.status}
        </span>
      </div>

      <div className="space-y-2 text-sm">
        <p><span className="text-text-dim font-mono">Guild:</span> {ticket.guild.name}</p>
        <p><span className="text-text-dim font-mono">Type:</span> {ticket.type || "N/A"}</p>
        <p><span className="text-text-dim font-mono">Opened by:</span> {ticket.openedBy}</p>
        <p><span className="text-text-dim font-mono">Claimed by:</span> {ticket.claimedBy || "N/A"}</p>
        <p><span className="text-text-dim font-mono">Closed by:</span> {ticket.closedBy || "N/A"}</p>
        <p><span className="text-text-dim font-mono">Created:</span> {new Date(ticket.createdAt).toLocaleString()}</p>
        {ticket.claimedAt && <p><span className="text-text-dim font-mono">Claimed at:</span> {new Date(ticket.claimedAt).toLocaleString()}</p>}
        {ticket.closedAt && <p><span className="text-text-dim font-mono">Closed at:</span> {new Date(ticket.closedAt).toLocaleString()}</p>}
      </div>
    </div>
  );
}
