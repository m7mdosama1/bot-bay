"use client";

import { useState } from "react";

interface Guild {
  id: string;
  name: string;
  iconUrl: string | null;
  ownerId: string;
}

interface Props {
  guild: Guild & {
    giveaways: any[];
    moderationLogs: any[];
    rouletteConfig: any;
  };
}

export function GiveawaySettings({ guild }: Props) {
  const [prize, setPrize] = useState("");
  const [winners, setWinners] = useState(1);
  const [duration, setDuration] = useState("24h");

  return (
    <div className="space-y-4">
      <h3 className="font-display text-xl font-bold text-white">Giveaway Configuration</h3>

      <div className="text-center py-12 text-text-dim">
        <p>Use <code className="font-mono text-amber-signal">/giveaway create</code> in Discord</p>
        <p className="mt-2">Existing giveaways in this server:</p>
        <div className="mt-4 space-y-2">
          {guild.giveaways.length === 0 ? (
            <p className="text-sm">No active giveaways</p>
          ) : (
            guild.giveaways.map((gw) => (
              <div key={gw.id} className="text-sm text-left p-2 bg-bg-raised rounded">
                <span className="font-mono">{gw.prize}</span> — {gw.status}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
