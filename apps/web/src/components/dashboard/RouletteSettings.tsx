"use client";

interface RouletteConfig {
  id: string;
  guildId: string;
  minBet: number;
  maxBet: number;
  currencyName: string;
  enabled: boolean;
}

interface Guild {
  id: string;
  name: string;
  iconUrl: string | null;
  ownerId: string;
}

interface Props {
  guild: Guild & {
    rouletteConfig: RouletteConfig | null;
  };
}

export function RouletteSettings({ guild }: Props) {
  const config = guild.rouletteConfig;

  return (
    <div className="space-y-4">
      <h3 className="font-display text-xl font-bold text-white">Roulette Configuration</h3>

      <div className="text-center py-12 text-text-dim">
        <p>Use <code className="font-mono text-amber-signal">/roulette-setup</code> in Discord</p>
        <p className="mt-2">Current settings:</p>
        {config ? (
          <div className="mt-4 text-left p-4 bg-bg-raised rounded space-y-2">
            <p><span className="font-mono">Min Bet:</span> {config.minBet}</p>
            <p><span className="font-mono">Max Bet:</span> {config.maxBet}</p>
            <p><span className="font-mono">Currency:</span> {config.currencyName}</p>
            <p><span className="font-mono">Enabled:</span> {config.enabled ? "Yes" : "No"}</p>
          </div>
        ) : (
          <p className="text-sm">No configuration set. Run /roulette-setup in Discord first.</p>
        )}
      </div>
    </div>
  );
}
