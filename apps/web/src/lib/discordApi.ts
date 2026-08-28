import {
  upsertUser,
  upsertGuild,
  getGuildById,
} from "@/lib/prisma";

export interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
  permissions: string;
  owner: boolean;
}

export interface DiscordGuildWithBots extends DiscordGuild {
  bots: {
    id: string;
    botId: string;
    isActive: boolean;
    addedAt: Date;
    bot: {
      id: string;
      name: string;
      slug: string;
      colorAccent: string;
      iconUrl: string | null;
    };
  }[];
}

export async function fetchUserGuilds(accessToken: string): Promise<DiscordGuild[]> {
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    attempts++;
    const response = await fetch("https://discord.com/api/users/@me/guilds", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (response.ok) {
      return response.json();
    }

    if (response.status === 429) {
      const errorText = await response.text().catch(() => "{}");
      try {
        const errorJson = JSON.parse(errorText);
        // Discord API retry_after is in seconds
        const retryAfterSec = errorJson.retry_after || 1;
        if (attempts < maxAttempts) {
          console.warn(`Rate limited by Discord. Retrying after ${retryAfterSec}s...`);
          await new Promise((resolve) => setTimeout(resolve, retryAfterSec * 1000 + 100)); // Add 100ms buffer
          continue;
        }
      } catch (e) {
        throw new Error(`Failed to fetch guilds: ${response.status} ${response.statusText} - ${errorText}`);
      }
      throw new Error(`Failed to fetch guilds: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(`Failed to fetch guilds: ${response.status} ${response.statusText} - ${errorText}`);
  }

  throw new Error("Failed to fetch guilds: Max attempts exceeded");
}

export async function fetchGuildDetails(guildId: string, accessToken: string) {
  const response = await fetch(
    `https://discord.com/api/guilds/${guildId}?with_counts=true&members=true`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    },
  );

  if (!response.ok) {
    throw new Error("Failed to fetch guild details");
  }

  return response.json();
}

export async function syncUserGuilds(
  userId: string,
  username: string,
  avatar: string | null,
  guilds: DiscordGuild[]
) {
  try {
    await upsertUser(userId, username, avatar);
  } catch (error) {
    console.error("Failed to upsert user:", error);
  }

  for (const guild of guilds) {
    try {
      await upsertGuild({
        id: guild.id,
        name: guild.name,
        icon: guild.icon,
        ownerId: guild.owner ? userId : "",
      });
    } catch (error) {
      console.error(`Failed to upsert guild ${guild.id}:`, error);
    }
  }
}

export async function checkBotInGuild(guildId: string, botSlug: string) {
  return getGuildById(guildId, { withBots: true });
}

export async function getBotBySlug(slug: string) {
  const result = await import("@/lib/prisma").then(m => m.getBotBySlug(slug));
  return result ? { slug } : null;
}

export async function getBotFeatures(slug: string) {
  const bot = await import("@/lib/prisma").then(m => m.getBotBySlug(slug));
  if (!bot) return [];
  return JSON.parse(bot.features) as string[];
}
