"use client";

import { useState } from "react";

interface GiveawayItem {
  id: string;
  prize: string;
  channel_id: string;
  winners_count: number;
  status: string;
  ends_at: string;
  created_at: string;
  participants?: string | null;
}

interface Props {
  guild: {
    id: string;
    name: string;
    giveaways?: GiveawayItem[];
  };
}

export function GiveawaySettings({ guild }: Props) {
  const [giveaways, setGiveaways] = useState<GiveawayItem[]>(guild.giveaways || []);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [prize, setPrize] = useState("");
  const [channelId, setChannelId] = useState("");
  const [winnersCount, setWinnersCount] = useState(1);
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!prize || !channelId) {
      setMsg({ type: "error", text: "يرجى كتابة الجائزة ومعرف القناة" });
      return;
    }

    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/dashboard/${guild.id}/giveaways`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prize,
          channelId,
          winnersCount,
          durationMinutes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create giveaway");

      setGiveaways([data.giveaway, ...giveaways]);
      setPrize("");
      setChannelId("");
      setShowCreateModal(false);
      setMsg({ type: "success", text: "تم إنشاء المسابقة بنجاح ونشرها في السيرفر!" });
      setTimeout(() => setMsg(null), 4000);
    } catch (err: any) {
      setMsg({ type: "error", text: err.message || "فشل إنشاء المسابقة" });
    } finally {
      setLoading(false);
    }
  }

  async function handleEndGiveaway(id: string) {
    if (!confirm("هل أنت متأكد من إنهاء هذه المسابقة الآن؟")) return;
    try {
      const res = await fetch(`/api/dashboard/${guild.id}/giveaways/${id}`, {
        method: "PATCH",
      });
      if (res.ok) {
        setGiveaways(
          giveaways.map((g) => (g.id === id ? { ...g, status: "ended" } : g))
        );
      }
    } catch (err) {
      console.error(err);
    }
  }

  const activeList = giveaways.filter((g) => g.status === "active");
  const pastList = giveaways.filter((g) => g.status !== "active");

  return (
    <div className="space-y-8">
      {/* Header & Create Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center text-2xl">
            🎉
          </div>
          <div>
            <h3 className="font-display text-xl font-bold text-white">
              Bounty Drop — Giveaways
            </h3>
            <p className="text-text-dim text-sm">
              إدارة وإنشاء المسابقات وتوزيع الجوائز تلقائياً
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowCreateModal(!showCreateModal)}
          className="px-5 py-2.5 bg-amber-signal hover:bg-amber-signal/90 text-black font-mono font-bold text-sm rounded-xl transition-all shadow-lg flex items-center gap-2"
        >
          <span>➕</span> إنشاء مسابقة جديدة
        </button>
      </div>

      {msg && (
        <div
          className={`p-4 rounded-xl font-mono text-sm border ${
            msg.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              : "bg-red-500/10 border-red-500/30 text-red-400"
          }`}
        >
          {msg.text}
        </div>
      )}

      {/* Create Modal / Form */}
      {showCreateModal && (
        <form
          onSubmit={handleCreate}
          className="p-6 rounded-2xl bg-bg-raised/70 border border-amber-signal/30 space-y-4 shadow-xl"
        >
          <h4 className="font-display text-lg font-bold text-white flex items-center gap-2">
            <span>🎁</span> تفاصيل المسابقة الجديدة
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-mono text-text-dim">
                اسم الجائزة (Prize) <span className="text-amber-signal">*</span>
              </label>
              <input
                type="text"
                value={prize}
                onChange={(e) => setPrize(e.target.value)}
                placeholder="مثال: Discord Nitro 1 Month"
                required
                className="w-full px-4 py-2.5 bg-bg-void border border-white/10 rounded-xl text-white font-mono text-sm focus:border-amber-signal/50 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-mono text-text-dim">
                معرف القناة (Channel ID) <span className="text-amber-signal">*</span>
              </label>
              <input
                type="text"
                value={channelId}
                onChange={(e) => setChannelId(e.target.value)}
                placeholder="مثال: 123456789012345678"
                required
                className="w-full px-4 py-2.5 bg-bg-void border border-white/10 rounded-xl text-white font-mono text-sm focus:border-amber-signal/50 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-mono text-text-dim">
                عدد الفائزين (Winners Count)
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={winnersCount}
                onChange={(e) => setWinnersCount(parseInt(e.target.value, 10))}
                className="w-full px-4 py-2.5 bg-bg-void border border-white/10 rounded-xl text-white font-mono text-sm focus:border-amber-signal/50 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-mono text-text-dim">
                المدة بالدقائق (Duration in Minutes)
              </label>
              <select
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10))}
                className="w-full px-4 py-2.5 bg-bg-void border border-white/10 rounded-xl text-white font-mono text-sm focus:border-amber-signal/50 focus:outline-none"
              >
                <option value="10">10 دقائق (10 Minutes)</option>
                <option value="30">30 دقيقة (30 Minutes)</option>
                <option value="60">ساعة واحدة (1 Hour)</option>
                <option value="360">6 ساعات (6 Hours)</option>
                <option value="720">12 ساعة (12 Hours)</option>
                <option value="1440">يوم كامل (24 Hours)</option>
                <option value="4320">3 أيام (3 Days)</option>
                <option value="10080">أسبوع (7 Days)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-3">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-mono font-bold text-sm rounded-xl transition-all disabled:opacity-50"
            >
              {loading ? "جاري الإنشاء..." : "🚀 نشر المسابقة الآن"}
            </button>
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-text-dim font-mono text-sm rounded-xl transition-all"
            >
              إلغاء
            </button>
          </div>
        </form>
      )}

      {/* Active Giveaways Section */}
      <div className="space-y-4">
        <h4 className="font-display text-base font-bold text-white flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          المسابقات الجارية حالياً ({activeList.length})
        </h4>

        {activeList.length === 0 ? (
          <div className="p-8 rounded-2xl bg-bg-raised/40 border border-white/5 text-center text-text-dim">
            <p className="font-mono text-sm">لا توجد مسابقات نشطة في هذا السيرفر حالياً.</p>
            <p className="text-xs text-text-dim mt-1">اضغط على زر "إنشاء مسابقة جديدة" لبدء مسابقة تفاعلية بالأزرار.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeList.map((gw) => {
              const participants = gw.participants ? gw.participants.split(",").filter(Boolean) : [];
              return (
                <div
                  key={gw.id}
                  className="p-5 rounded-2xl bg-bg-raised/60 border border-white/10 hover:border-amber-signal/40 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h5 className="font-display text-lg font-bold text-white">
                        {gw.prize}
                      </h5>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono text-xs">
                        نشطة
                      </span>
                    </div>

                    <div className="mt-3 space-y-1.5 text-xs font-mono text-text-dim">
                      <div>🏆 عدد الفائزين: <span className="text-white">{gw.winners_count}</span></div>
                      <div>👥 المشاركين: <span className="text-amber-400 font-bold">{participants.length} عضو</span></div>
                      <div>⏰ تنتهي في: <span className="text-white">{new Date(gw.ends_at).toLocaleString("ar-EG")}</span></div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                    <span className="text-[11px] font-mono text-text-dim">
                      ID: {gw.id.slice(0, 8)}...
                    </span>
                    <button
                      onClick={() => handleEndGiveaway(gw.id)}
                      className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white font-mono text-xs rounded-lg transition-all"
                    >
                      إنهاء واختيار الفائز الآن
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Past Giveaways */}
      {pastList.length > 0 && (
        <div className="space-y-4 pt-6 border-t border-white/5">
          <h4 className="font-display text-base font-bold text-text-dim">
            سجل المسابقات السابقة ({pastList.length})
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/10 text-xs font-mono text-text-dim">
                  <th className="py-2.5 px-3">الجائزة</th>
                  <th className="py-2.5 px-3">الفائزين</th>
                  <th className="py-2.5 px-3">الحالة</th>
                  <th className="py-2.5 px-3">تاريخ الإنشاء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm font-mono">
                {pastList.slice(0, 5).map((gw) => (
                  <tr key={gw.id} className="text-text-dim hover:text-white">
                    <td className="py-2.5 px-3 font-semibold text-white">{gw.prize}</td>
                    <td className="py-2.5 px-3">{gw.winners_count}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded bg-white/5 text-xs text-text-dim">
                        {gw.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-xs">
                      {new Date(gw.created_at).toLocaleDateString()}
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
