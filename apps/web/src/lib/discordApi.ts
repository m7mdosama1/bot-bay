import { prisma } from "@/lib/prisma";

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
  const response = await fetch("https://discord.com/api/users/@me/guilds", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch guilds");
  }

  return response.json();
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
  await prisma.user.upsert({
    where: { id: userId },
    update: {
      username,
      avatar,
    },
    create: {
      id: userId,
      username,
      avatar,
    },
  });

  for (const guild of guilds) {
    await prisma.guild.upsert({
      where: { id: guild.id },
      update: {
        name: guild.name,
        iconUrl: guild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png` : null,
        ownerId: guild.owner ? userId : undefined,
      },
      create: {
        id: guild.id,
        name: guild.name,
        iconUrl: guild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png` : null,
        ownerId: guild.owner ? userId : "",
      },
    });
  }
}

export async function checkBotInGuild(guildId: string, botSlug: string) {
  return prisma.guildBot.findFirst({
    where: {
      guildId,
      bot: { slug: botSlug },
    },
    include: {
      bot: true,
    },
  });
}

export async function getBotBySlug(slug: string) {
  return prisma.bot.findUnique({
    where: { slug },
  });
}

export async function getBotFeatures(slug: string) {
  const bot = await getBotBySlug(slug);
  if (!bot) return [];
  return JSON.parse(bot.features) as string[];
}
