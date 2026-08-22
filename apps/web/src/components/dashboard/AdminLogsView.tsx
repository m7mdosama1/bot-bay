"use client";

interface ModerationLog {
  id: string;
  guildId: string;
  action: string;
  targetUserId: string;
  moderatorId: string;
  reason: string | null;
  createdAt: Date;
}

interface Props {
  guild: {
    id: string;
    name: string;
    iconUrl: string | null;
    ownerId: string;
    moderationLogs: ModerationLog[];
  };
}

export function AdminLogsView({ guild }: Props) {
  return (
    <div className="space-y-4">
      <h3 className="font-display text-xl font-bold text-white">Moderation Logs</h3>

      {guild.moderationLogs.length === 0 ? (
        <div className="text-center py-12 text-text-dim">
          <p>No moderation logs yet. Use <code className="font-mono text-amber-signal">/ban, /kick, /mute, /warn</code> in Discord to generate logs.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-line">
                <th className="text-left py-2 font-mono text-xs text-text-dim">Action</th>
                <th className="text-left py-2 font-mono text-xs text-text-dim">Target</th>
                <th className="text-left py-2 font-mono text-xs text-text-dim">Mod</th>
                <th className="text-left py-2 font-mono text-xs text-text-dim">Reason</th>
                <th className="text-left py-2 font-mono text-xs text-text-dim">Time</th>
              </tr>
            </thead>
            <tbody>
              {guild.moderationLogs.map((log) => (
                <tr key={log.id} className="border-b border-line/30">
                  <td className="py-2 font-mono text-sm capitalize">{log.action}</td>
                  <td className="py-2 font-mono text-sm text-text-dim">{log.targetUserId}</td>
                  <td className="py-2 font-mono text-sm text-text-dim">{log.moderatorId}</td>
                  <td className="py-2 font-mono text-sm text-text-dim">{log.reason || "—"}</td>
                  <td className="py-2 font-mono text-xs text-text-dim">{new Date(log.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
