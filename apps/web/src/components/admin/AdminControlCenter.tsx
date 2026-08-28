"use client";

import { useState } from "react";
import Link from "next/link";

interface Bot {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  clientId: string;
  permissions: string;
  colorAccent: string;
  isActive: boolean;
  serverCount: number;
}

interface Guild {
  id: string;
  name: string;
  iconUrl: string | null;
  ownerId: string;
  createdAt: string;
  activeBotsCount: number;
  ticketsCount: number;
}

interface Ticket {
  id: string;
  guild_id: string;
  guildName: string;
  number: number;
  type: string | null;
  status: string;
  opened_by: string;
  created_at: string;
}

interface Props {
  adminPath: string;
  stats: {
    totalUsers: number;
    totalGuilds: number;
    totalTickets: number;
    openTickets: number;
    totalGiveaways: number;
  };
  bots: Bot[];
  guilds: Guild[];
  tickets: Ticket[];
}

export function AdminControlCenter({
  adminPath,
  stats,
  bots: initialBots,
  guilds,
  tickets,
}: Props) {
  const [activeTab, setActiveTab] = useState<"overview" | "bots" | "guilds" | "tickets">("overview");
  const [bots, setBots] = useState<Bot[]>(initialBots);
  const [editingBot, setEditingBot] = useState<Bot | null>(null);
  const [editClientId, setEditClientId] = useState("");
  const [editPermissions, setEditPermissions] = useState("");
  const [editTagline, setEditTagline] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  async function handleToggleBot(botId: string) {
    try {
      const res = await fetch("/api/admin/bots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle", botId }),
      });
      if (res.ok) {
        setBots(
          bots.map((b) => (b.id === botId ? { ...b, isActive: !b.isActive } : b))
        );
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleSaveBotDetails(e: React.FormEvent) {
    e.preventDefault();
    if (!editingBot) return;
    setIsUpdating(true);

    try {
      const res = await fetch("/api/admin/bots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          botId: editingBot.id,
          data: {
            clientId: editClientId,
            permissions: editPermissions,
            tagline: editTagline,
          },
        }),
      });

      if (res.ok) {
        setBots(
          bots.map((b) =>
            b.id === editingBot.id
              ? {
                  ...b,
                  clientId: editClientId,
                  permissions: editPermissions,
                  tagline: editTagline,
                }
              : b
          )
        );
        setEditingBot(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  }

  function startEditing(bot: Bot) {
    setEditingBot(bot);
    setEditClientId(bot.clientId || "");
    setEditPermissions(bot.permissions || "8");
    setEditTagline(bot.tagline || "");
  }

  const filteredGuilds = guilds.filter(
    (g) =>
      g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.id.includes(searchTerm)
  );

  return (
    <div className="space-y-8">
      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-bg-raised/70 rounded-2xl border border-white/10 w-fit">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-5 py-2.5 rounded-xl font-mono text-xs font-semibold transition-all ${
            activeTab === "overview"
              ? "bg-amber-signal text-black shadow-lg"
              : "text-text-dim hover:text-white"
          }`}
        >
          📊 نظرة عامة (Overview)
        </button>
        <button
          onClick={() => setActiveTab("bots")}
          className={`px-5 py-2.5 rounded-xl font-mono text-xs font-semibold transition-all ${
            activeTab === "bots"
              ? "bg-amber-signal text-black shadow-lg"
              : "text-text-dim hover:text-white"
          }`}
        >
          🤖 إدارة البوتات ({bots.length})
        </button>
        <button
          onClick={() => setActiveTab("guilds")}
          className={`px-5 py-2.5 rounded-xl font-mono text-xs font-semibold transition-all ${
            activeTab === "guilds"
              ? "bg-amber-signal text-black shadow-lg"
              : "text-text-dim hover:text-white"
          }`}
        >
          🏰 السيرفرات المتصلة ({guilds.length})
        </button>
        <button
          onClick={() => setActiveTab("tickets")}
          className={`px-5 py-2.5 rounded-xl font-mono text-xs font-semibold transition-all ${
            activeTab === "tickets"
              ? "bg-amber-signal text-black shadow-lg"
              : "text-text-dim hover:text-white"
          }`}
        >
          🎫 مركز التذاكر العام ({stats.totalTickets})
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="card-bg rounded-2xl p-5 border border-white/5 shadow-lg">
              <div className="text-xs font-mono text-text-dim">المستخدمين المسجلين</div>
              <div className="text-3xl font-extrabold font-mono text-white mt-2">
                {stats.totalUsers}
              </div>
            </div>

            <div className="card-bg rounded-2xl p-5 border border-white/5 shadow-lg">
              <div className="text-xs font-mono text-text-dim">السيرفرات المشتركة</div>
              <div className="text-3xl font-extrabold font-mono text-amber-400 mt-2">
                {stats.totalGuilds}
              </div>
            </div>

            <div className="card-bg rounded-2xl p-5 border border-white/5 shadow-lg">
              <div className="text-xs font-mono text-text-dim">البوتات النشطة</div>
              <div className="text-3xl font-extrabold font-mono text-emerald-400 mt-2">
                {bots.filter((b) => b.isActive).length}{" "}
                <span className="text-xs text-text-dim font-normal">/ {bots.length}</span>
              </div>
            </div>

            <div className="card-bg rounded-2xl p-5 border border-white/5 shadow-lg">
              <div className="text-xs font-mono text-text-dim">التذاكر المفتوحة</div>
              <div className="text-3xl font-extrabold font-mono text-blue-400 mt-2">
                {stats.openTickets}
              </div>
            </div>

            <div className="card-bg rounded-2xl p-5 border border-white/5 shadow-lg">
              <div className="text-xs font-mono text-text-dim">إجمالي المسابقات</div>
              <div className="text-3xl font-extrabold font-mono text-violet-400 mt-2">
                {stats.totalGiveaways}
              </div>
            </div>
          </div>

          {/* Quick Bots Status Summary */}
          <div className="card-bg rounded-3xl p-6 border border-white/5 space-y-4">
            <h3 className="font-display text-lg font-bold text-white">
              حالة البوتات المركزية
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {bots.map((bot) => (
                <div
                  key={bot.id}
                  className="p-4 rounded-xl bg-bg-raised/60 border border-white/5 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm"
                      style={{
                        backgroundColor: `${bot.colorAccent || "#F2A93B"}20`,
                        color: bot.colorAccent || "#F2A93B",
                      }}
                    >
                      {bot.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white">{bot.name}</h4>
                      <p className="text-xs text-text-dim font-mono">
                        {bot.serverCount || 0} سيرفر يستخدمه
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full font-mono text-[10px] ${
                      bot.isActive
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-red-500/20 text-red-400"
                    }`}
                  >
                    {bot.isActive ? "ONLINE" : "OFFLINE"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BOTS MANAGEMENT */}
      {activeTab === "bots" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-xl font-bold text-white">
              التحكم الشامل في البوتات (Global Bot Controls)
            </h3>
            <p className="text-text-dim text-xs font-mono">
              تفعيل وضع الصيانة أو تعديل صلاحيات و Client ID كل بوت
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/10 card-bg">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/10 text-xs font-mono text-text-dim bg-white/5">
                  <th className="py-3 px-4">البوت</th>
                  <th className="py-3 px-4">الـ Slug</th>
                  <th className="py-3 px-4">Client ID</th>
                  <th className="py-3 px-4">السيرفرات</th>
                  <th className="py-3 px-4">الحالة العامة</th>
                  <th className="py-3 px-4">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm font-mono">
                {bots.map((bot) => (
                  <tr key={bot.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4 font-semibold text-white flex items-center gap-3">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: bot.colorAccent || "#F2A93B" }}
                      />
                      {bot.name}
                    </td>
                    <td className="py-3 px-4 text-text-dim">{bot.slug}</td>
                    <td className="py-3 px-4 text-text-dim text-xs font-mono">
                      {bot.clientId || "غير محدد"}
                    </td>
                    <td className="py-3 px-4 text-amber-400 font-bold">
                      {bot.serverCount || 0}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleToggleBot(bot.id)}
                        className={`px-3 py-1 rounded-full text-xs font-mono font-bold transition-all ${
                          bot.isActive
                            ? "bg-emerald-500/20 text-emerald-400 hover:bg-red-500/20 hover:text-red-400"
                            : "bg-red-500/20 text-red-400 hover:bg-emerald-500/20 hover:text-emerald-400"
                        }`}
                        title="انقر لتغيير الحالة عالمياً"
                      >
                        {bot.isActive ? "🟢 Active (شغال)" : "🔴 Maintenance (معطل)"}
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => startEditing(bot)}
                        className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white text-xs rounded-lg border border-white/10 transition-all"
                      >
                        ✏️ تعديل
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Edit Bot Modal */}
          {editingBot && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <form
                onSubmit={handleSaveBotDetails}
                className="bg-bg-raised p-6 rounded-3xl border border-white/10 max-w-lg w-full space-y-4 shadow-2xl"
              >
                <h4 className="font-display text-lg font-bold text-white flex items-center gap-2">
                  <span>⚙️</span> تعديل بيانات: {editingBot.name}
                </h4>

                <div className="space-y-1.5">
                  <label className="block text-xs font-mono text-text-dim">
                    Discord Client ID
                  </label>
                  <input
                    type="text"
                    value={editClientId}
                    onChange={(e) => setEditClientId(e.target.value)}
                    className="w-full px-4 py-2 bg-bg-void border border-white/10 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-amber-signal"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-mono text-text-dim">
                    Default Permissions Integer
                  </label>
                  <input
                    type="text"
                    value={editPermissions}
                    onChange={(e) => setEditPermissions(e.target.value)}
                    className="w-full px-4 py-2 bg-bg-void border border-white/10 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-amber-signal"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-mono text-text-dim">
                    Tagline (الوصف المختصر)
                  </label>
                  <input
                    type="text"
                    value={editTagline}
                    onChange={(e) => setEditTagline(e.target.value)}
                    className="w-full px-4 py-2 bg-bg-void border border-white/10 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-amber-signal"
                  />
                </div>

                <div className="flex items-center gap-3 pt-3">
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="px-5 py-2 bg-amber-signal text-black font-mono font-bold text-xs rounded-xl hover:bg-amber-signal/90 transition-all disabled:opacity-50"
                  >
                    {isUpdating ? "جاري الحفظ..." : "حفظ التغييرات"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingBot(null)}
                    className="px-4 py-2 bg-white/5 text-text-dim font-mono text-xs rounded-xl hover:bg-white/10"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: GUILDS EXPLORER */}
      {activeTab === "guilds" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="font-display text-xl font-bold text-white">
              السيرفرات المتصلة بالمنصة
            </h3>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="بحث بالاسم أو ID السيرفر..."
              className="px-4 py-2 bg-bg-raised border border-white/10 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-amber-signal max-w-xs"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredGuilds.map((guild) => (
              <div
                key={guild.id}
                className="card-bg rounded-2xl p-5 border border-white/5 hover:border-white/15 transition-all flex flex-col justify-between"
              >
                <div className="flex items-start gap-4">
                  {guild.iconUrl ? (
                    <img
                      src={guild.iconUrl}
                      alt={guild.name}
                      className="w-14 h-14 rounded-2xl object-cover border border-white/10 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-amber-signal/20 flex items-center justify-center text-xl font-bold text-amber-signal flex-shrink-0">
                      {guild.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <h4 className="font-display text-base font-bold text-white line-clamp-1">
                      {guild.name}
                    </h4>
                    <p className="text-[11px] font-mono text-text-dim mt-0.5">
                      ID: {guild.id}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs font-mono">
                      <span className="text-emerald-400">
                        🤖 {guild.activeBotsCount || 0} بوتات
                      </span>
                      <span className="text-blue-400">
                        🎫 {guild.ticketsCount || 0} تذكرة
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-text-dim">
                    انضم: {new Date(guild.createdAt).toLocaleDateString()}
                  </span>
                  <Link
                    href={`/dashboard/${guild.id}`}
                    className="text-xs font-mono text-amber-signal hover:underline"
                  >
                    فتح الداشبورد →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: TICKETS CENTER */}
      {activeTab === "tickets" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-xl font-bold text-white">
              مركز مراقبة التذاكر العام
            </h3>
            <span className="text-xs font-mono text-text-dim">
              آخر {tickets.length} تذكرة تم إنشاؤها عبر جميع السيرفرات
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/10 card-bg">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/10 text-xs font-mono text-text-dim bg-white/5">
                  <th className="py-3 px-4">رقم التذكرة</th>
                  <th className="py-3 px-4">السيرفر</th>
                  <th className="py-3 px-4">القسم</th>
                  <th className="py-3 px-4">الحالة</th>
                  <th className="py-3 px-4">العضو</th>
                  <th className="py-3 px-4">التاريخ</th>
                  <th className="py-3 px-4">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm font-mono">
                {tickets.map((t) => (
                  <tr key={t.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4 font-bold text-white">#{t.number}</td>
                    <td className="py-3 px-4 text-text-dim">{t.guildName}</td>
                    <td className="py-3 px-4 text-text-dim">{t.type || "عام"}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-xs ${
                          t.status === "open"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-white/10 text-text-dim"
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-text-dim text-xs">{t.opened_by}</td>
                    <td className="py-3 px-4 text-xs text-text-dim">
                      {new Date(t.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <Link
                        href={`/dashboard/${t.guild_id}/tickets/${t.id}`}
                        className="text-amber-signal text-xs hover:underline"
                      >
                        عرض الـ Transcript
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
