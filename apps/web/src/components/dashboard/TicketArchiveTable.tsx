"use client";

import Link from "next/link";

interface Ticket {
  id: string;
  guildId?: string;
  guild_id?: string;
  number: number;
  channelId?: string;
  channel_id?: string;
  type: string | null;
  openedBy?: string;
  opened_by?: string;
  claimedBy?: string | null;
  claimed_by?: string | null;
  closedBy?: string | null;
  closed_by?: string | null;
  status: string;
  transcriptContent?: string | null;
  transcript_content?: string | null;
  createdAt?: Date | string;
  created_at?: Date | string;
  claimedAt?: Date | string | null;
  claimed_at?: Date | string | null;
  closedAt?: Date | string | null;
  closed_at?: Date | string | null;
}

interface Props {
  tickets: Ticket[];
  guildId?: string;
}

export function TicketArchiveTable({ tickets, guildId }: Props) {
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
          {tickets.map((ticket) => {
            const targetGuildId = guildId || ticket.guild_id || ticket.guildId;
            const opened = ticket.opened_by || ticket.openedBy || "—";
            const claimed = ticket.claimed_by || ticket.claimedBy || "—";
            const closed = ticket.closed_by || ticket.closedBy || "—";
            const created = ticket.created_at || ticket.createdAt;

            return (
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
                <td className="py-2 font-mono text-sm text-text-dim">{opened}</td>
                <td className="py-2 font-mono text-sm text-text-dim">{claimed}</td>
                <td className="py-2 font-mono text-sm text-text-dim">{closed}</td>
                <td className="py-2 font-mono text-xs text-text-dim">
                  {created ? new Date(created).toLocaleString() : "—"}
                </td>
                <td className="py-2">
                  <Link
                    href={`/dashboard/${targetGuildId}/tickets/${ticket.id}`}
                    className="text-amber-signal hover:text-amber-signal-hover font-mono text-xs"
                  >
                    View Transcript
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

