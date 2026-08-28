"use client";

import { useState } from "react";

interface Props {
  guildId: string;
  config: any;
}

export function VerificationSettings({ guildId, config }: Props) {
  const [verifyChannelId, setVerifyChannelId] = useState(config?.verify_channel_id || "");
  const [unverifiedRoleId, setUnverifiedRoleId] = useState(config?.unverified_role_id || "");
  const [verifiedRoleId, setVerifiedRoleId] = useState(config?.verified_role_id || "");
  const [vpnCheck, setVpnCheck] = useState(config?.vpn_check_enabled ?? true);
  const [altCheck, setAltCheck] = useState(config?.alt_check_enabled ?? true);
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
          botSlug: "verification",
          verifyChannelId: verifyChannelId || undefined,
          unverifiedRoleId: unverifiedRoleId || undefined,
          verifiedRoleId: verifiedRoleId || undefined,
          vpnCheckEnabled: vpnCheck,
          altCheckEnabled: altCheck,
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
    <div className="space-y-8">
      <div className="flex items-center gap-3.5 mb-2">
        <div className="w-12 h-12 rounded-2xl bg-violet-500/20 flex items-center justify-center text-2xl">🛡️</div>
        <div>
          <h3 className="font-display text-xl font-bold text-white">Sentinel — Verification Security Settings</h3>
          <p className="text-text-dim text-sm">Configure automated raid-defense, anti-alt detection, and role verification gates</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Verify Channel */}
        <div className="space-y-2 md:col-span-2">
          <label className="block text-xs font-mono text-text-dim">
            Verification Channel ID <span className="text-amber-signal">*</span>
          </label>
          <input
            type="text"
            value={verifyChannelId}
            onChange={(e) => setVerifyChannelId(e.target.value)}
            placeholder="e.g. 1234567890123456789"
            className="w-full px-4 py-2.5 bg-bg-raised border border-white/10 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-violet-500/50 transition-all placeholder:text-white/20"
          />
          <p className="text-[11px] text-text-dim">The locked landing channel where the verification gate panel is placed.</p>
        </div>

        {/* Unverified Role */}
        <div className="space-y-2">
          <label className="block text-xs font-mono text-text-dim">
            Unverified Role ID <span className="text-amber-signal">*</span>
          </label>
          <input
            type="text"
            value={unverifiedRoleId}
            onChange={(e) => setUnverifiedRoleId(e.target.value)}
            placeholder="e.g. 1234567890123456789"
            className="w-full px-4 py-2.5 bg-bg-raised border border-white/10 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-violet-500/50 transition-all placeholder:text-white/20"
          />
          <p className="text-[11px] text-text-dim">Role automatically assigned to newly joined members (Restricted access).</p>
        </div>

        {/* Verified Role */}
        <div className="space-y-2">
          <label className="block text-xs font-mono text-text-dim">
            Verified Member Role ID <span className="text-amber-signal">*</span>
          </label>
          <input
            type="text"
            value={verifiedRoleId}
            onChange={(e) => setVerifiedRoleId(e.target.value)}
            placeholder="e.g. 1234567890123456789"
            className="w-full px-4 py-2.5 bg-bg-raised border border-white/10 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-violet-500/50 transition-all placeholder:text-white/20"
          />
          <p className="text-[11px] text-text-dim">Role assigned after successful verification (Unlocks full server).</p>
        </div>
      </div>

      {/* Security Toggles */}
      <div className="p-5 bg-bg-raised/70 rounded-2xl border border-white/5 space-y-4">
        <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">🔒 Advanced Anti-Raid Protections</h4>
        <div className="flex flex-wrap gap-8">
          <label className="flex items-center gap-3 cursor-pointer group">
            <div className="relative">
              <input
                type="checkbox"
                checked={vpnCheck}
                onChange={(e) => setVpnCheck(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-white/10 rounded-full peer-checked:bg-violet-500 transition-colors"></div>
              <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-5"></div>
            </div>
            <div>
              <span className="text-xs font-mono text-text-dim group-hover:text-white transition-colors block">VPN / Proxy Detection</span>
              <p className="text-[11px] text-text-dim">Blocks members attempting to verify through anonymizing proxies</p>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer group">
            <div className="relative">
              <input
                type="checkbox"
                checked={altCheck}
                onChange={(e) => setAltCheck(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-white/10 rounded-full peer-checked:bg-violet-500 transition-colors"></div>
              <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-5"></div>
            </div>
            <div>
              <span className="text-xs font-mono text-text-dim group-hover:text-white transition-colors block">Alt Account Filter (&lt; 72h)</span>
              <p className="text-[11px] text-text-dim">Requires Discord account age to be at least 3 days old</p>
            </div>
          </label>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center gap-4 pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-violet-500 hover:bg-violet-400 disabled:opacity-50 text-white font-mono font-bold text-sm rounded-xl transition-all shadow-lg"
        >
          {saving ? "Saving..." : "💾 Save Changes"}
        </button>
        {status === "success" && (
          <span className="text-emerald-400 text-sm font-mono animate-pulse">✓ Saved to Discord successfully!</span>
        )}
        {status === "error" && (
          <span className="text-red-400 text-sm font-mono">✗ Failed to save changes</span>
        )}
      </div>
    </div>
  );
}
