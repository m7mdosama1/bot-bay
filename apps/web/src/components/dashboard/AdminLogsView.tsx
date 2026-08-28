"use client";

import { useState } from "react";

interface ModerationLog {
  id: string;
  guildId?: string;
  guild_id?: string;
  action: string;
  targetUserId?: string;
  target_user_id?: string;
  moderatorId?: string;
  moderator_id?: string;
  reason?: string | null;
  createdAt?: string | Date;
  created_at?: string | Date;
}

interface Props {
  guild: {
    id: string;
    name: string;
    iconUrl?: string | null;
    moderationLogs?: ModerationLog[];
  };
}

export function AdminLogsView({ guild }: Props) {
  const logs = guild.moderationLogs || [];
  const [filterAction, setFilterAction] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredLogs = logs.filter((log) => {
    const actionMatch = filterAction === "all" || log.action.toLowerCase() === filterAction.toLowerCase();
    const target = log.target_user_id || log.targetUserId || "";
    const mod = log.moderator_id || log.moderatorId || "";
    const reason = log.reason || "";
    const searchMatch =
      !searchQuery ||
      target.includes(searchQuery) ||
      mod.includes(searchQuery) ||
      reason.toLowerCase().includes(searchQuery.toLowerCase());
    return actionMatch && searchMatch;
  });

  const getActionBadge = (action: string) => {
    switch (action.toLowerCase()) {
      case "ban":
        return <span className="px-2.5 py-1 rounded-lg bg-red-500/20 text-red-400 font-mono text-xs font-semibold border border-red-500/30">🔨 BAN</span>;
      case "kick":
        return <span className="px-2.5 py-1 rounded-lg bg-orange-500/20 text-orange-400 font-mono text-xs font-semibold border border-orange-500/30">👢 KICK</span>;
      case "mute":
      case "timeout":
        return <span className="px-2.5 py-1 rounded-lg bg-yellow-500/20 text-yellow-400 font-mono text-xs font-semibold border border-yellow-500/30">🔇 MUTE</span>;
      case "warn":
        return <span className="px-2.5 py-1 rounded-lg bg-blue-500/20 text-blue-400 font-mono text-xs font-semibold border border-blue-500/30">⚠️ WARN</span>;
      default:
        return <span className="px-2.5 py-1 rounded-lg bg-white/10 text-white font-mono text-xs uppercase">{action}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-red-500/20 flex items-center justify-center text-2xl">
            🛡️
          </div>
          <div>
            <h3 className="font-display text-xl font-bold text-white">
              Aegis — Server Moderation Logs
            </h3>
            <p className="text-text-dim text-sm">
              سجلات الإشراف، العقوبات، وحماية السيرفر
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono px-3 py-1.5 rounded-xl bg-bg-raised text-text-dim border border-white/5">
            إجمالي السجلات: <strong className="text-white">{logs.length}</strong>
          </span>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث بمعرف العضو، المشرف، أو السبب..."
            className="w-full px-4 py-2 bg-bg-raised border border-white/10 rounded-xl text-white font-mono text-sm placeholder:text-text-dim focus:outline-none focus:border-amber-signal/50"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-bg-raised p-1 rounded-xl border border-white/5 overflow-x-auto">
          {["all", "ban", "kick", "mute", "warn"].map((act) => (
            <button
              key={act}
              onClick={() => setFilterAction(act)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono capitalize transition-all ${
                filterAction === act
                  ? "bg-amber-signal text-black font-bold"
                  : "text-text-dim hover:text-white"
              }`}
            >
              {act === "all" ? "الكل" : act}
            </button>
          ))}
        </div>
      </div>

      {/* Logs Table */}
      {filteredLogs.length === 0 ? (
        <div className="text-center py-16 text-text-dim bg-bg-raised/40 rounded-2xl border border-white/5">
          <div className="text-3xl mb-2">📋</div>
          <p className="font-mono text-sm">لا توجد سجلات إشراف مطابقة.</p>
          <p className="text-xs text-text-dim mt-1">
            أي عملية حظر، طرد، أو كتم تتم عبر بوت الإدارة ستظهر هنا فوراً.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/5 bg-bg-raised/40">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/10 text-xs font-mono text-text-dim bg-white/5">
                <th className="py-3 px-4">نوع الإجراء</th>
                <th className="py-3 px-4">العضو المستهدف</th>
                <th className="py-3 px-4">المشرف المسؤول</th>
                <th className="py-3 px-4">السبب</th>
                <th className="py-3 px-4">التاريخ والوقت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm font-mono">
              {filteredLogs.map((log) => {
                const target = log.target_user_id || log.targetUserId || "—";
                const mod = log.moderator_id || log.moderatorId || "—";
                const created = log.created_at || log.createdAt;

                return (
                  <tr key={log.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4">{getActionBadge(log.action)}</td>
                    <td className="py-3 px-4 text-white font-semibold">{target}</td>
                    <td className="py-3 px-4 text-text-dim">{mod}</td>
                    <td className="py-3 px-4 text-text-dim max-w-xs truncate">
                      {log.reason || "بدون سبب محدد"}
                    </td>
                    <td className="py-3 px-4 text-xs text-text-dim">
                      {created ? new Date(created).toLocaleString("ar-EG") : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
