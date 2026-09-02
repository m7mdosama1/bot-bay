"use client";

import Link from "next/link";

interface Guild {
  id: string;
  name: string;
  iconUrl: string | null;
  ownerId: string;
}

interface Ticket {
  number: number;
  type: string | null;
  openedBy?: string;
  opened_by?: string;
  claimedBy?: string | null;
  claimed_by?: string | null;
  closedBy?: string | null;
  closed_by?: string | null;
  status?: string;
  transcriptContent?: string | null;
  transcript_content?: string | null;
  createdAt?: Date | string;
  created_at?: Date | string;
  claimedAt?: Date | string | null;
  claimed_at?: Date | string | null;
  closedAt?: Date | string | null;
  closed_at?: Date | string | null;
  guildName?: string;
  guildIconUrl?: string | null;
  guild?: Guild;
}

interface Props {
  ticket: Ticket;
  adminPath?: string;
}

export function TicketTranscriptView({ ticket, adminPath }: Props) {
  const backHref = adminPath ? `/${adminPath}` : "/dashboard";
  const transcriptContent = ticket.transcriptContent ?? ticket.transcript_content;
  const openedBy = ticket.openedBy ?? ticket.opened_by;
  const claimedBy = ticket.claimedBy ?? ticket.claimed_by;
  const closedBy = ticket.closedBy ?? ticket.closed_by;
  const createdAt = ticket.createdAt ?? ticket.created_at;
  const claimedAt = ticket.claimedAt ?? ticket.claimed_at;
  const closedAt = ticket.closedAt ?? ticket.closed_at;
  const guildName = ticket.guild?.name ?? ticket.guildName;
  const transcriptLines = transcriptContent
    ? transcriptContent.split("\n").filter((line) => line.trim())
    : [];
  const formatDate = (value: Date | string | null | undefined) => {
    if (!value) return "N/A";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "N/A" : date.toLocaleString();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold text-white">
          Ticket #{ticket.number} — Transcript
        </h1>
        <Link
          href={backHref}
          className="text-text-dim hover:text-amber-signal font-mono text-sm transition-colors"
        >
          ← Back 
        </Link>
      </div>

      <div className="card-bg rounded-xl p-6 space-y-4">
        <div className="space-y-2 text-sm">
          <p><span className="text-text-dim font-mono">Guild:</span> {guildName || "N/A"}</p>
          <p><span className="text-text-dim font-mono">Type:</span> {ticket.type || "N/A"}</p>
          <p><span className="text-text-dim font-mono">Status:</span> {ticket.status}</p>
          <p><span className="text-text-dim font-mono">Opened by:</span> {openedBy || "N/A"}</p>
          <p><span className="text-text-dim font-mono">Claimed by:</span> {claimedBy || "N/A"}</p>
          <p><span className="text-text-dim font-mono">Closed by:</span> {closedBy || "N/A"}</p>
          <p><span className="text-text-dim font-mono">Created:</span> {formatDate(createdAt)}</p>
          {claimedAt && <p><span className="text-text-dim font-mono">Claimed at:</span> {formatDate(claimedAt)}</p>}
          {closedAt && <p><span className="text-text-dim font-mono">Closed at:</span> {formatDate(closedAt)}</p>}
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
        href={backHref}
        className="inline-block btn btn-ghost rounded-xl font-mono text-sm"
      >
        ← Back 
      </Link>
    </div>
  );
}
