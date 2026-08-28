"use client";

import { useState } from "react";
import Link from "next/link";

interface Props {
  guildId: string;
  config: any;
}

export function WelcomeSettings({ guildId, config }: Props) {
  const [channelId, setChannelId] = useState(config?.channel_id || "");
  const [roleId, setRoleId] = useState(config?.role_id || "");
  const [messageText, setMessageText] = useState(config?.message_text || "Welcome to the server! 🎉");
  const [embedColor, setEmbedColor] = useState(config?.embed_color || "#3CFF4A");
  const [showAvatar, setShowAvatar] = useState(config?.show_avatar ?? true);
  const [showBanner, setShowBanner] = useState(config?.show_banner ?? true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  async function handleSave() {
    setSaving(true);
    setStatus("idle");
    try {
      const res = await fetch(`/api/dashboard/${guildId}/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          botSlug: "welcome",
          channelId: channelId || undefined,
          roleId: roleId || undefined,
          messageText,
          embedColor,
          showAvatar,
          showBanner,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setStatus("success");
      setTimeout(() => setStatus("idle"), 3000);
    } catch {
      setStatus("error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center text-xl">👋</div>
        <div>
          <h3 className="font-display text-xl font-bold text-white">Welcome Bot Settings</h3>
          <p className="text-text-dim text-sm">إعدادات بوت الترحيب</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Channel ID */}
        <div className="space-y-2">
          <label className="block text-sm font-mono text-text-dim">
            Welcome Channel ID
            <span className="text-amber-signal ml-1">*</span>
          </label>
          <input
            type="text"
            value={channelId}
            onChange={(e) => setChannelId(e.target.value)}
            placeholder="e.g. 1234567890123456789"
            className="w-full px-4 py-2.5 bg-bg-raised border border-white/10 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-amber-signal/50 focus:ring-1 focus:ring-amber-signal/30 transition-all placeholder:text-white/20"
          />
          <p className="text-xs text-text-dim">القناة اللي هيتبعت فيها رسائل الترحيب</p>
        </div>

        {/* Role ID */}
        <div className="space-y-2">
          <label className="block text-sm font-mono text-text-dim">
            Verified Role ID
            <span className="text-amber-signal ml-1">*</span>
          </label>
          <input
            type="text"
            value={roleId}
            onChange={(e) => setRoleId(e.target.value)}
            placeholder="e.g. 1234567890123456789"
            className="w-full px-4 py-2.5 bg-bg-raised border border-white/10 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-amber-signal/50 focus:ring-1 focus:ring-amber-signal/30 transition-all placeholder:text-white/20"
          />
          <p className="text-xs text-text-dim">الرول اللي هيتضاف لما يقبل القوانين</p>
        </div>

        {/* Embed Color */}
        <div className="space-y-2">
          <label className="block text-sm font-mono text-text-dim">Embed Color</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={embedColor}
              onChange={(e) => setEmbedColor(e.target.value)}
              className="w-10 h-10 rounded-lg cursor-pointer border border-white/10 bg-transparent"
            />
            <input
              type="text"
              value={embedColor}
              onChange={(e) => setEmbedColor(e.target.value)}
              className="flex-1 px-4 py-2.5 bg-bg-raised border border-white/10 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-amber-signal/50 focus:ring-1 focus:ring-amber-signal/30 transition-all"
            />
          </div>
          <p className="text-xs text-text-dim">لون الـ Embed في رسالة الترحيب</p>
        </div>

        {/* Welcome Message */}
        <div className="space-y-2 md:col-span-2">
          <label className="block text-sm font-mono text-text-dim">Welcome Message</label>
          <textarea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            rows={3}
            placeholder="Welcome to the server! 🎉"
            className="w-full px-4 py-2.5 bg-bg-raised border border-white/10 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-amber-signal/50 focus:ring-1 focus:ring-amber-signal/30 transition-all resize-none placeholder:text-white/20"
          />
          <p className="text-xs text-text-dim">رسالة الترحيب — استخدم {"{{user}}"} لاسم العضو و {"{{server}}"} لاسم السيرفر</p>
        </div>
      </div>

      {/* Toggles */}
      <div className="flex flex-wrap gap-6 p-4 bg-bg-raised rounded-lg border border-white/5">
        <label className="flex items-center gap-3 cursor-pointer group">
          <div className="relative">
            <input
              type="checkbox"
              checked={showAvatar}
              onChange={(e) => setShowAvatar(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-white/10 rounded-full peer-checked:bg-emerald-500 transition-colors"></div>
            <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-5"></div>
          </div>
          <span className="text-sm text-text-dim group-hover:text-white transition-colors">Show Avatar</span>
        </label>

        <label className="flex items-center gap-3 cursor-pointer group">
          <div className="relative">
            <input
              type="checkbox"
              checked={showBanner}
              onChange={(e) => setShowBanner(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-white/10 rounded-full peer-checked:bg-emerald-500 transition-colors"></div>
            <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-5"></div>
          </div>
          <span className="text-sm text-text-dim group-hover:text-white transition-colors">Show Banner</span>
        </label>
      </div>

      {/* Discord Live Preview Card */}
      <div className="pt-4 border-t border-white/5 space-y-3">
        <h4 className="font-display text-sm font-bold text-text-dim flex items-center gap-2">
          <span>👁️</span> معاينة حية لرسالة الترحيب في ديسكورد (Live Preview)
        </h4>

        <div className="bg-[#2B2D31] rounded-2xl p-5 border border-white/5 max-w-xl">
          {/* Mock Discord message layout */}
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center font-bold text-black flex-shrink-0">
              👋
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-white">Threshold</span>
                <span className="px-1.5 py-0.2 rounded bg-[#5865F2] text-white text-[10px] font-semibold">BOT</span>
                <span className="text-[11px] text-[#949BA4]">اليوم في 12:00 م</span>
              </div>

              {/* Embed Box */}
              <div
                className="bg-[#1E1F22] rounded-lg p-4 border-l-4 space-y-3"
                style={{ borderLeftColor: embedColor || "#3CFF4A" }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h5 className="font-bold text-sm text-white">
                      Welcome to the server! 👋
                    </h5>
                    <p className="text-xs text-[#DBDEE1] mt-1 whitespace-pre-wrap">
                      {messageText
                        .replace(/\{\{user\}\}/g, "@NewMember")
                        .replace(/\{\{server\}\}/g, "My Awesome Server")}
                    </p>
                  </div>
                  {showAvatar && (
                    <div className="w-12 h-12 rounded-full bg-amber-signal/20 border border-white/10 flex items-center justify-center text-lg flex-shrink-0">
                      👤
                    </div>
                  )}
                </div>

                {showBanner && (
                  <div className="w-full h-24 rounded-lg bg-gradient-to-r from-emerald-500/20 via-blue-500/20 to-purple-500/20 border border-white/5 flex items-center justify-center text-xs text-text-dim font-mono">
                    [ Server Banner Image ]
                  </div>
                )}
              </div>

              {/* Mock Button */}
              <div className="pt-1">
                <button
                  type="button"
                  disabled
                  className="px-4 py-1.5 bg-[#5865F2] text-white text-xs font-semibold rounded flex items-center gap-1.5 opacity-90 cursor-default"
                >
                  <span>✅</span> Accept Rules | الموافقة على القوانين
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center gap-4 pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-mono font-bold text-sm rounded-lg transition-all"
        >
          {saving ? "Saving..." : "💾 Save Settings"}
        </button>
        {status === "success" && (
          <span className="text-emerald-400 text-sm font-mono animate-pulse">✓ Saved successfully!</span>
        )}
        {status === "error" && (
          <span className="text-red-400 text-sm font-mono">✗ Failed to save</span>
        )}
      </div>
    </div>
  );
}
