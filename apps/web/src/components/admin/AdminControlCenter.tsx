"use client";

import { useState } from "react";
import Link from "next/link";

interface Bot {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  features: string;
  clientId: string;
  permissions: string;
  iconUrl?: string | null;
  colorAccent: string;
  isActive: boolean;
  serverCount: number;
}

interface Guild {
  id: string;
  name: string;
  iconUrl: string | null;
  ownerId: string;
  activeBotsCount: number;
  ticketsCount: number;
  bots: {
    botId: string;
    botName: string;
    isAdminBlocked: boolean;
    adminBlockReason: string | null;
  }[];
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

interface User {
  id: string;
  username: string;
  avatar: string | null;
  isAdmin: boolean;
  isBanned: boolean;
  bannedAt: string | null;
  banReason: string | null;
  createdAt: string;
}

interface AuditLog {
  id: string;
  adminUserId: string;
  action: string;
  targetType: string;
  targetId: string;
  reason: string | null;
  createdAt: string;
}

interface Props {
  adminPath: string;
  stats: {
    totalUsers: number;
    totalGuilds: number;
    totalTickets: number;
    openTickets: number;
    totalGiveaways: number;
    bannedUsers: number;
    blockedBots: number;
  };
  bots: Bot[];
  guilds: Guild[];
  tickets: Ticket[];
  users: User[];
  auditLogs: AuditLog[];
}

export function AdminControlCenter({
  adminPath,
  stats,
  bots: initialBots,
  guilds,
  tickets,
  users,
  auditLogs,
}: Props) {
  const [activeTab, setActiveTab] = useState<"overview" | "bots" | "guilds" | "tickets" | "users" | "audit">("overview");
  const [bots, setBots] = useState<Bot[]>(initialBots);
  const [adminUsers, setAdminUsers] = useState<User[]>(users);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingBot, setEditingBot] = useState<Bot | null>(null);

  // Form states
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formTagline, setFormTagline] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formFeatures, setFormFeatures] = useState("");
  const [formClientId, setFormClientId] = useState("");
  const [formPermissions, setFormPermissions] = useState("8");
  const [formColor, setFormColor] = useState("#F2A93B");
  const [formIconUrl, setFormIconUrl] = useState("");

  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function resetForm() {
    setFormName("");
    setFormSlug("");
    setFormTagline("");
    setFormDesc("");
    setFormFeatures("");
    setFormClientId("");
    setFormPermissions("8");
    setFormColor("#F2A93B");
    setFormIconUrl("");
  }

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

  async function handleCreateBot(e: React.FormEvent) {
    e.preventDefault();
    if (!formName || !formSlug || !formClientId) {
      setFeedback({ type: "error", text: "Please fill in all required fields (Name, Slug, Client ID)" });
      return;
    }

    setIsProcessing(true);
    setFeedback(null);

    try {
      const featuresArray = formFeatures.split(",").map((f) => f.trim()).filter(Boolean);
      const res = await fetch("/api/admin/bots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          data: {
            name: formName,
            slug: formSlug.toLowerCase().trim(),
            tagline: formTagline || "Discord Bot",
            description: formDesc || "Professional Discord Bot",
            features: JSON.stringify(featuresArray),
            clientId: formClientId.trim(),
            permissions: formPermissions || "8",
            colorAccent: formColor || "#F2A93B",
            iconUrl: formIconUrl || null,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create bot");

      setBots([...bots, { ...data.bot, serverCount: 0 }]);
      setShowCreateModal(false);
      resetForm();
      setFeedback({ type: "success", text: `Bot "${formName}" created and added to platform successfully!` });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Failed to create bot" });
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleUpdateBot(e: React.FormEvent) {
    e.preventDefault();
    if (!editingBot) return;

    setIsProcessing(true);
    setFeedback(null);

    try {
      const featuresArray = formFeatures.split(",").map((f) => f.trim()).filter(Boolean);
      const res = await fetch("/api/admin/bots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          botId: editingBot.id,
          data: {
            name: formName,
            tagline: formTagline,
            description: formDesc,
            features: JSON.stringify(featuresArray),
            clientId: formClientId,
            permissions: formPermissions,
            colorAccent: formColor,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update bot");

      setBots(
        bots.map((b) => (b.id === editingBot.id ? { ...b, ...data.bot } : b))
      );
      setEditingBot(null);
      resetForm();
      setFeedback({ type: "success", text: "Bot details updated successfully!" });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Failed to update bot" });
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleDeleteBot(botId: string, botName: string) {
    if (!confirm(`Are you sure you want to permanently delete "${botName}" from Bot Bay?`)) return;

    try {
      const res = await fetch("/api/admin/bots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", botId }),
      });
      if (res.ok) {
        setBots(bots.filter((b) => b.id !== botId));
        setFeedback({ type: "success", text: `Bot "${botName}" has been removed.` });
        setTimeout(() => setFeedback(null), 4000);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleUserBan(user: User) {
    const action = user.isBanned ? "unban-user" : "ban-user";
    const reason = user.isBanned ? null : window.prompt("Ban reason (optional):");
    if (!user.isBanned && reason === null) return;

    try {
      const res = await fetch("/api/admin/controls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, userId: user.id, reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update user ban");

      setAdminUsers(adminUsers.map((item) => item.id === user.id
        ? { ...item, ...data.user }
        : item));
      setFeedback({
        type: "success",
        text: user.isBanned ? `User ${user.username} unbanned.` : `User ${user.username} banned.`,
      });
    } catch (error: unknown) {
      setFeedback({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to update user ban",
      });
    }
  }

  async function handleGuildBotBlock(guildId: string, bot: Guild["bots"][number]) {
    const action = bot.isAdminBlocked ? "unblock-guild-bot" : "block-guild-bot";
    const reason = bot.isAdminBlocked ? null : window.prompt("Block reason (optional):");
    if (!bot.isAdminBlocked && reason === null) return;

    try {
      const res = await fetch("/api/admin/controls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, guildId, botId: bot.botId, reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update bot block");
      setFeedback({ type: "success", text: `${bot.botName} ${bot.isAdminBlocked ? "unblocked" : "blocked"} for this server.` });
      window.location.reload();
    } catch (error: unknown) {
      setFeedback({ type: "error", text: error instanceof Error ? error.message : "Failed to update bot block" });
    }
  }

  function startEditing(bot: Bot) {
    setEditingBot(bot);
    setFormName(bot.name || "");
    setFormSlug(bot.slug || "");
    setFormTagline(bot.tagline || "");
    setFormDesc(bot.description || "");
    try {
      const parsed = typeof bot.features === "string" && bot.features.startsWith("[")
        ? JSON.parse(bot.features)
        : bot.features;
      setFormFeatures(Array.isArray(parsed) ? parsed.join(", ") : bot.features || "");
    } catch {
      setFormFeatures(bot.features || "");
    }
    setFormClientId(bot.clientId || "");
    setFormPermissions(bot.permissions || "8");
    setFormColor(bot.colorAccent || "#F2A93B");
    setFormIconUrl(bot.iconUrl || "");
  }

  const filteredGuilds = guilds.filter(
    (g) =>
      g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.id.includes(searchTerm)
  );

  return (
    <div className="space-y-8">
      {feedback && (
        <div
          className={`p-4 rounded-2xl font-mono text-sm border shadow-lg ${
            feedback.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              : "bg-red-500/10 border-red-500/30 text-red-400"
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Navigation Tabs & Add Bot Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 p-1.5 bg-bg-raised/80 backdrop-blur rounded-2xl border border-white/10 w-fit">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-5 py-2.5 rounded-xl font-mono text-xs font-semibold transition-all ${
              activeTab === "overview"
                ? "bg-amber-signal text-black shadow-lg"
                : "text-text-dim hover:text-white"
            }`}
          >
            📊 Overview
          </button>
          <button
            onClick={() => setActiveTab("bots")}
            className={`px-5 py-2.5 rounded-xl font-mono text-xs font-semibold transition-all ${
              activeTab === "bots"
                ? "bg-amber-signal text-black shadow-lg"
                : "text-text-dim hover:text-white"
            }`}
          >
            🤖 Bot Management ({bots.length})
          </button>
          <button
            onClick={() => setActiveTab("guilds")}
            className={`px-5 py-2.5 rounded-xl font-mono text-xs font-semibold transition-all ${
              activeTab === "guilds"
                ? "bg-amber-signal text-black shadow-lg"
                : "text-text-dim hover:text-white"
            }`}
          >
            🏰 Connected Servers ({guilds.length})
          </button>
          <button
            onClick={() => setActiveTab("tickets")}
            className={`px-5 py-2.5 rounded-xl font-mono text-xs font-semibold transition-all ${
              activeTab === "tickets"
                ? "bg-amber-signal text-black shadow-lg"
                : "text-text-dim hover:text-white"
            }`}
          >
            🎫 Tickets Center ({stats.totalTickets})
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`px-5 py-2.5 rounded-xl font-mono text-xs font-semibold transition-all ${
              activeTab === "users"
                ? "bg-amber-signal text-black shadow-lg"
                : "text-text-dim hover:text-white"
            }`}
          >
            👥 Users ({adminUsers.length})
          </button>
          <button
            onClick={() => setActiveTab("audit")}
            className={`px-5 py-2.5 rounded-xl font-mono text-xs font-semibold transition-all ${
              activeTab === "audit" ? "bg-amber-signal text-black shadow-lg" : "text-text-dim hover:text-white"
            }`}
          >
            🧾 Audit Log ({auditLogs.length})
          </button>
        </div>

        {activeTab === "bots" && (
          <button
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-mono font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2"
          >
            <span>➕</span> Add New Bot to Platform
          </button>
        )}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="card-bg rounded-2xl p-5 border border-white/5 shadow-lg">
              <div className="text-xs font-mono text-text-dim">Registered Users</div>
              <div className="text-3xl font-extrabold font-mono text-white mt-2">
                {stats.totalUsers}
              </div>
            </div>

            <div className="card-bg rounded-2xl p-5 border border-white/5 shadow-lg">
              <div className="text-xs font-mono text-text-dim">Active Servers</div>
              <div className="text-3xl font-extrabold font-mono text-amber-400 mt-2">
                {stats.totalGuilds}
              </div>
            </div>

            <div className="card-bg rounded-2xl p-5 border border-white/5 shadow-lg">
              <div className="text-xs font-mono text-text-dim">Platform Bots</div>
              <div className="text-3xl font-extrabold font-mono text-emerald-400 mt-2">
                {bots.filter((b) => b.isActive).length}{" "}
                <span className="text-xs text-text-dim font-normal">/ {bots.length}</span>
              </div>
            </div>

            <div className="card-bg rounded-2xl p-5 border border-white/5 shadow-lg">
              <div className="text-xs font-mono text-text-dim">Open Tickets</div>
              <div className="text-3xl font-extrabold font-mono text-blue-400 mt-2">
                {stats.openTickets}
              </div>
            </div>

            <div className="card-bg rounded-2xl p-5 border border-white/5 shadow-lg">
              <div className="text-xs font-mono text-text-dim">Total Giveaways</div>
              <div className="text-3xl font-extrabold font-mono text-violet-400 mt-2">
                {stats.totalGiveaways}
              </div>
            </div>

            <div className="card-bg rounded-2xl p-5 border border-white/5 shadow-lg">
              <div className="text-xs font-mono text-text-dim">Banned Users</div>
              <div className="text-3xl font-extrabold font-mono text-red-400 mt-2">{stats.bannedUsers}</div>
            </div>

            <div className="card-bg rounded-2xl p-5 border border-white/5 shadow-lg">
              <div className="text-xs font-mono text-text-dim">Blocked Bot Links</div>
              <div className="text-3xl font-extrabold font-mono text-orange-400 mt-2">{stats.blockedBots}</div>
            </div>
          </div>

          <div className="card-bg rounded-3xl p-6 border border-white/5 space-y-4">
            <h3 className="font-display text-lg font-bold text-white">
              Global Platform Health
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
                        {bot.serverCount || 0} servers connected
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
                    {bot.isActive ? "ONLINE" : "MAINTENANCE"}
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
          <div className="overflow-x-auto rounded-3xl border border-white/10 card-bg shadow-2xl">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/10 text-xs font-mono text-text-dim bg-white/5">
                  <th className="py-3 px-4">Bot</th>
                  <th className="py-3 px-4">Slug</th>
                  <th className="py-3 px-4">Client ID</th>
                  <th className="py-3 px-4">Servers</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm font-mono">
                {bots.map((bot) => (
                  <tr key={bot.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4 font-semibold text-white flex items-center gap-3">
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: bot.colorAccent || "#F2A93B" }}
                      />
                      <div>
                        <div>{bot.name}</div>
                        <div className="text-[10px] text-text-dim font-normal">{bot.tagline}</div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-text-dim">{bot.slug}</td>
                    <td className="py-3 px-4 text-text-dim text-xs font-mono">
                      {bot.clientId || "—"}
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
                      >
                        {bot.isActive ? "🟢 Online" : "🔴 Maintenance"}
                      </button>
                    </td>
                    <td className="py-3 px-4 flex items-center gap-2">
                      <button
                        onClick={() => startEditing(bot)}
                        className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white text-xs rounded-lg border border-white/10 transition-all"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => handleDeleteBot(bot.id, bot.name)}
                        className="px-2.5 py-1.5 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white text-xs rounded-lg transition-all"
                        title="Delete Bot"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Create / Edit Bot Modal */}
          {(showCreateModal || editingBot) && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
              <form
                onSubmit={editingBot ? handleUpdateBot : handleCreateBot}
                className="bg-bg-raised p-6 rounded-3xl border border-white/10 max-w-xl w-full space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto"
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <h4 className="font-display text-lg font-bold text-white flex items-center gap-2">
                    <span>🤖</span> {editingBot ? `Edit Bot: ${editingBot.name}` : "Add New Discord Bot"}
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setEditingBot(null);
                    }}
                    className="text-text-dim hover:text-white text-sm"
                  >
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-mono text-text-dim">Bot Name *</label>
                    <input
                      type="text"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g. Sentinel Verify"
                      required
                      className="w-full px-4 py-2 bg-bg-void border border-white/10 rounded-xl text-white font-mono text-sm focus:border-amber-signal focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-mono text-text-dim">URL Slug (Unique) *</label>
                    <input
                      type="text"
                      value={formSlug}
                      onChange={(e) => setFormSlug(e.target.value)}
                      placeholder="e.g. music-master"
                      disabled={!!editingBot}
                      required
                      className="w-full px-4 py-2 bg-bg-void border border-white/10 rounded-xl text-white font-mono text-sm focus:border-amber-signal focus:outline-none disabled:opacity-50"
                    />
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <label className="block text-xs font-mono text-text-dim">Tagline (Short Summary)</label>
                    <input
                      type="text"
                      value={formTagline}
                      onChange={(e) => setFormTagline(e.target.value)}
                      placeholder="e.g. High-fidelity music playback with DJ controls"
                      className="w-full px-4 py-2 bg-bg-void border border-white/10 rounded-xl text-white font-mono text-sm focus:border-amber-signal focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <label className="block text-xs font-mono text-text-dim">Full Description</label>
                    <textarea
                      value={formDesc}
                      onChange={(e) => setFormDesc(e.target.value)}
                      rows={2}
                      placeholder="Describe the bot features and purpose..."
                      className="w-full px-4 py-2 bg-bg-void border border-white/10 rounded-xl text-white font-mono text-sm focus:border-amber-signal focus:outline-none resize-none"
                    />
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <label className="block text-xs font-mono text-text-dim">Features (comma-separated)</label>
                    <input
                      type="text"
                      value={formFeatures}
                      onChange={(e) => setFormFeatures(e.target.value)}
                      placeholder="Spotify, Filters, 24/7 Voice, Autoplay"
                      className="w-full px-4 py-2 bg-bg-void border border-white/10 rounded-xl text-white font-mono text-sm focus:border-amber-signal focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-mono text-text-dim">Discord Client ID *</label>
                    <input
                      type="text"
                      value={formClientId}
                      onChange={(e) => setFormClientId(e.target.value)}
                      placeholder="123456789012345678"
                      required
                      className="w-full px-4 py-2 bg-bg-void border border-white/10 rounded-xl text-white font-mono text-sm focus:border-amber-signal focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-mono text-text-dim">Default Permissions Integer</label>
                    <input
                      type="text"
                      value={formPermissions}
                      onChange={(e) => setFormPermissions(e.target.value)}
                      placeholder="8"
                      className="w-full px-4 py-2 bg-bg-void border border-white/10 rounded-xl text-white font-mono text-sm focus:border-amber-signal focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-mono text-text-dim">Brand Color Accent</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={formColor}
                        onChange={(e) => setFormColor(e.target.value)}
                        className="w-10 h-10 rounded-xl cursor-pointer bg-transparent border border-white/10"
                      />
                      <input
                        type="text"
                        value={formColor}
                        onChange={(e) => setFormColor(e.target.value)}
                        className="flex-1 px-4 py-2 bg-bg-void border border-white/10 rounded-xl text-white font-mono text-sm focus:border-amber-signal focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-mono text-text-dim">Icon URL (Optional)</label>
                    <input
                      type="text"
                      value={formIconUrl}
                      onChange={(e) => setFormIconUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full px-4 py-2 bg-bg-void border border-white/10 rounded-xl text-white font-mono text-sm focus:border-amber-signal focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-white/10">
                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="px-6 py-2.5 bg-amber-signal text-black font-mono font-bold text-sm rounded-xl hover:bg-amber-signal/90 transition-all disabled:opacity-50"
                  >
                    {isProcessing ? "Saving..." : editingBot ? "💾 Save Changes" : "🚀 Add Bot to Bot Bay"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setEditingBot(null);
                    }}
                    className="px-4 py-2.5 bg-white/5 text-text-dim font-mono text-sm rounded-xl hover:bg-white/10"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: GUILDS EXPLORER */}
      {activeTab === "users" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-display text-xl font-bold text-white">Platform Users</h3>
              <p className="text-sm text-text-dim">Review accounts and control platform access.</p>
            </div>
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search username or Discord ID..."
              className="px-4 py-2 bg-bg-raised border border-white/10 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-amber-signal max-w-xs"
            />
          </div>

          <div className="overflow-x-auto rounded-3xl border border-white/10 card-bg shadow-2xl">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/10 text-xs font-mono text-text-dim bg-white/5">
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Discord ID</th>
                  <th className="py-3 px-4">Joined</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm font-mono">
                {adminUsers
                  .filter((user) => user.username.toLowerCase().includes(searchTerm.toLowerCase()) || user.id.includes(searchTerm))
                  .map((user) => (
                    <tr key={user.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-3 px-4 text-white font-semibold">{user.username}</td>
                      <td className="py-3 px-4 text-text-dim text-xs">{user.id}</td>
                      <td className="py-3 px-4 text-text-dim text-xs">{new Date(user.createdAt).toLocaleDateString()}</td>
                      <td className="py-3 px-4">
                        <span className={user.isBanned ? "text-red-400" : "text-emerald-400"}>
                          {user.isBanned ? "BANNED" : "ACTIVE"}
                        </span>
                        {user.banReason && <div className="text-[10px] text-text-dim mt-1">{user.banReason}</div>}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleUserBan(user)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold ${user.isBanned ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}
                        >
                          {user.isBanned ? "Lift Ban" : "Ban User"}
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: GUILDS EXPLORER */}
      {activeTab === "guilds" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="font-display text-xl font-bold text-white">
              Connected Discord Servers
            </h3>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by server name or ID..."
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
                        🤖 {guild.activeBotsCount || 0} Active Bots
                      </span>
                      <span className="text-blue-400">
                        🎫 {guild.ticketsCount || 0} Tickets
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                  <span className="text-[11px] font-mono text-text-dim">
                    Owner: {guild.ownerId.slice(0, 8)}...
                  </span>
                  <Link
                    href={`/dashboard/${guild.id}`}
                    className="text-xs font-mono text-amber-signal hover:underline"
                  >
                    Open Dashboard →
                  </Link>
                </div>
                {guild.bots?.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-white/5 space-y-2">
                    <p className="text-[10px] uppercase tracking-wider text-text-dim">Bot access controls</p>
                    {guild.bots.map((bot) => (
                      <div key={bot.botId} className="flex items-center justify-between gap-2 text-xs">
                        <span className="text-text-dim truncate">{bot.botName}</span>
                        <button
                          onClick={() => handleGuildBotBlock(guild.id, bot)}
                          className={`px-2 py-1 rounded-md font-mono ${bot.isAdminBlocked ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}
                        >
                          {bot.isAdminBlocked ? "Unblock" : "Block"}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "audit" && (
        <div className="space-y-6">
          <div>
            <h3 className="font-display text-xl font-bold text-white">Administrator Audit Log</h3>
            <p className="text-sm text-text-dim">Every sensitive platform action is recorded here.</p>
          </div>
          <div className="overflow-x-auto rounded-3xl border border-white/10 card-bg shadow-2xl">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/10 text-xs font-mono text-text-dim bg-white/5">
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Target</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4">Admin</th>
                  <th className="py-3 px-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm font-mono">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4 text-amber-400">{log.action}</td>
                    <td className="py-3 px-4 text-text-dim">{log.targetType}: {log.targetId}</td>
                    <td className="py-3 px-4 text-text-dim">{log.reason || "-"}</td>
                    <td className="py-3 px-4 text-text-dim">{log.adminUserId}</td>
                    <td className="py-3 px-4 text-text-dim text-xs">{new Date(log.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: TICKETS CENTER */}
      {activeTab === "tickets" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-xl font-bold text-white">
              Global Ticket Monitor
            </h3>
            <span className="text-xs font-mono text-text-dim">
              Latest {tickets.length} tickets across all servers
            </span>
          </div>

          <div className="overflow-x-auto rounded-3xl border border-white/10 card-bg shadow-2xl">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/10 text-xs font-mono text-text-dim bg-white/5">
                  <th className="py-3 px-4">Ticket</th>
                  <th className="py-3 px-4">Server</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Opened By</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm font-mono">
                {tickets.map((t) => (
                  <tr key={t.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4 font-bold text-white">#{t.number}</td>
                    <td className="py-3 px-4 text-text-dim">{t.guildName}</td>
                    <td className="py-3 px-4 text-text-dim">{t.type || "general"}</td>
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
                        View Transcript
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
