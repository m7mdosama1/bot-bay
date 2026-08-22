"use client";

import Link from "next/link";

interface Guild {
  id: string;
  name: string;
  iconUrl: string | null;
  ownerId: string;
}

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
  guild: Guild;
}

interface Props {
  ticket: Ticket;
}

export function TicketTranscriptView({ ticket }: Props) {
  const transcriptLines = ticket.transcriptContent
    ? ticket.transcriptContent.split("\n").filter((line) => line.trim())
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold text-white">
          Ticket #{ticket.number} — Transcript
        </h1>
        <Link
          href={`/${process.env.ADMIN_SECRET_PATH}`}
          className="text-text-dim hover:text-amber-signal font-mono text-sm transition-colors"
        >
          ← Back to Admin Panel
        </Link>
      </div>

      <div className="card-bg rounded-xl p-6 space-y-4">
        <div className="space-y-2 text-sm">
          <p><span className="text-text-dim font-mono">Guild:</span> {ticket.guild.name}</p>
          <p><span className="text-text-dim font-mono">Type:</span> {ticket.type || "N/A"}</p>
          <p><span className="text-text-dim font-mono">Status:</span> {ticket.status}</p>
          <p><span className="text-text-dim font-mono">Opened by:</span> {ticket.openedBy}</p>
          <p><span className="text-text-dim font-mono">Claimed by:</span> {ticket.claimedBy || "N/A"}</p>
          <p><span className="text-text-dim font-mono">Closed by:</span> {ticket.closedBy || "N/A"}</p>
          <p><span className="text-text-dim font-mono">Created:</span> {new Date(ticket.createdAt).toLocaleString()}</p>
          {ticket.claimedAt && <p><span className="text-text-dim font-mono">Claimed at:</span> {new Date(ticket.claimedAt).toLocaleString()}</p>}
          {ticket.closedAt && <p><span className="text-text-dim font-mono">Closed at:</span> {new Date(ticket.closedAt).toLocaleString()}</p>}
        </div>
      </div>

      <div className="card-bg rounded-xl p-6">
        <h2 className="font-display text-xl font-bold text-white mb-4">
          Conversation Log
        </h2>

        {transcriptLines.length === 0 ? (
          <p className="text-text-dim">No transcript content available.</p>
        ) : (
          <div className="bg-bg-void rounded-lg p-4 overflow-y-auto max-h-[600px]">
            <div className="space-y-1">
              {transcriptLines.map((line, i) => {
                const isHeader = line.startsWith("=== ") || line.startsWith("--- ");
                const isSender = line.includes("]:");
                
                return (
                  <div
                    key={i}
                    className={`${
                      isHeader ? "text-text-dim font-mono text-xs" : 
                      isSender ? "text-white font-mono text-sm" : 
                      "text-text-dim font-mono text-sm"
                    }`}
                  >
                    {line}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <Link
        href={`/${process.env.ADMIN_SECRET_PATH}`}
        className="inline-block btn btn-ghost rounded-xl font-mono text-sm"
      >
        ← Back to Admin Panel
      </Link>
    </div>
  );
}
