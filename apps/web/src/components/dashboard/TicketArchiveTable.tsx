"use client";

import Link from "next/link";

interface Ticket {
  id: string;
  guildId: string;
  number: number;
  channelId: string;
  type: string | null;
  openedBy: string;
  claimedBy: string | null;
  closedBy: string | null;
  status: string;
  transcriptContent: string | null;
  createdAt: Date;
  claimedAt: Date | null;
  closedAt: Date | null;
}

interface Props {
  tickets: Ticket[];
}

export function TicketArchiveTable({ tickets }: Props) {
  if (tickets.length === 0) {
    return (
      <div className="text-center py-12 text-text-dim">
        <p>No tickets found for this server.</p>
        <p className="mt-2 text-sm">
          Tickets created with Deskline bot will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-line">
            <th className="text-left py-2 font-mono text-xs text-text-dim">Ticket</th>
            <th className="text-left py-2 font-mono text-xs text-text-dim">Type</th>
            <th className="text-left py-2 font-mono text-xs text-text-dim">Status</th>
            <th className="text-left py-2 font-mono text-xs text-text-dim">Opened By</th>
            <th className="text-left py-2 font-mono text-xs text-text-dim">Claimed By</th>
            <th className="text-left py-2 font-mono text-xs text-text-dim">Closed By</th>
            <th className="text-left py-2 font-mono text-xs text-text-dim">Created</th>
            <th className="text-left py-2 font-mono text-xs text-text-dim">Actions</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((ticket) => (
            <tr key={ticket.id} className="border-b border-line/30">
              <td className="py-2 font-mono text-sm text-white">#{ticket.number}</td>
              <td className="py-2 font-mono text-sm text-text-dim">{ticket.type || "—"}</td>
              <td className="py-2 font-mono text-xs">
                <span
                  className={`px-2 py-1 rounded font-mono text-xs ${
                    ticket.status === "open"
                      ? "bg-green-500/20 text-green-400"
                      : ticket.status === "claimed"
                      ? "bg-yellow-500/20 text-yellow-400"
                      : "bg-gray-500/20 text-gray-400"
                  }`}
                >
                  {ticket.status}
                </span>
              </td>
              <td className="py-2 font-mono text-sm text-text-dim">{ticket.openedBy}</td>
              <td className="py-2 font-mono text-sm text-text-dim">{ticket.claimedBy || "—"}</td>
              <td className="py-2 font-mono text-sm text-text-dim">{ticket.closedBy || "—"}</td>
              <td className="py-2 font-mono text-xs text-text-dim">{new Date(ticket.createdAt).toLocaleString()}</td>
              <td className="py-2">
                <Link
                  href={`/dashboard/${ticket.guildId}/tickets/${ticket.id}`}
                  className="text-amber-signal hover:text-amber-signal-hover font-mono text-xs"
                >
                  View Transcript
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
