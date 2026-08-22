import os
import asyncio
import random as random_module
from datetime import datetime, timedelta
from dotenv import load_dotenv
import discord
from discord import app_commands
from discord.ext import commands, tasks

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, insert, update

import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "packages", "db"))
from shared_models import Giveaway

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///../../bot-bay.db")
connect_args = {"ssl": "require"} if DATABASE_URL.startswith("postgresql") else {}
engine = create_async_engine(DATABASE_URL, echo=False, connect_args=connect_args)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

intents = discord.Intents.default()
intents.message_content = True
intents.guilds = True

bot = commands.Bot(command_prefix="!", intents=intents)


@bot.event
async def on_ready():
    print(f"Bounty Drop is online as {bot.user}")
    await bot.tree.sync()
    check_giveaways.start()


def parse_duration(duration: str) -> int:
    total = 0
    parts = duration.split()
    for part in parts:
        if part.endswith("d"):
            total += int(part[:-1]) * 86400
        elif part.endswith("h"):
            total += int(part[:-1]) * 3600
        elif part.endswith("m"):
            total += int(part[:-1]) * 60
        elif part.endswith("s"):
            total += int(part[:-1])
    return total


def create_giveaway_embed(prize: str, winners: int, ends_at: datetime) -> discord.Embed:
    embed = discord.Embed(
        title="🎁 GIVEAWAY",
        description=f"**Prize:** {prize}\n**Winners:** {winners}\n**Ends:** <t:{int(ends_at.timestamp())}:R>",
        color=0xFFA500,
    )
    embed.set_footer(text="React with 🎉 to enter!")
    return embed


class GiveawayView(discord.ui.View):
    def __init__(self, giveaway_id: str, prize: str):
        super().__init__(timeout=None)
        self.giveaway_id = giveaway_id
        self.prize = prize

    @discord.ui.button(
        label="🎉 Join Giveaway",
        style=discord.ButtonStyle.success,
        emoji="🎉",
        custom_id="giveaway_join",
    )
    async def join(self, interaction: discord.Interaction, button: discord.ui.Button):
        await interaction.response.send_message("✅ You entered the giveaway!", ephemeral=True)


@bot.tree.command(name="giveaway_create", description="Create a new giveaway")
@app_commands.describe(prize="What prize to give away", winners="Number of winners", duration="Duration (e.g., 1d 12h 30m 15s)")
@app_commands.checks.has_permissions(administrator=True)
async def giveaway_create(
    interaction: discord.Interaction,
    prize: str,
    winners: int = 1,
    duration: str = "24h",
):
    duration_seconds = parse_duration(duration)
    if duration_seconds <= 0:
        await interaction.response.send_message("Invalid duration format.", ephemeral=True)
        return

    ends_at = datetime.utcnow() + timedelta(seconds=duration_seconds)

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            insert(Giveaway).values(
                guild_id=str(interaction.guild_id),
                channel_id=str(interaction.channel_id),
                prize=prize,
                winners_count=winners,
                ends_at=ends_at,
                status="active",
                created_by=str(interaction.user.id),
            )
        )
        await session.commit()
        giveaway_id = result.lastrowid

    embed = create_giveaway_embed(prize, winners, ends_at)
    view = GiveawayView(str(giveaway_id), prize)
    msg = await interaction.response.send_message(embed=embed, view=view)
    message = await interaction.interaction.original_response()

    async with AsyncSessionLocal() as session:
        await session.execute(
            update(Giveaway)
            .where(Giveaway.id == str(giveaway_id))
            .values(message_id=str(message.id))
        )
        await session.commit()


@bot.tree.command(name="giveaway_end", description="End a giveaway early")
@app_commands.checks.has_permissions(administrator=True)
async def giveaway_end(interaction: discord.Interaction, message_id: str):
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(Giveaway).where(
                Giveaway.channel_id == str(interaction.channel_id),
                Giveaway.message_id == message_id,
            )
        )
        giveaway = result.fetchone()

        if not giveaway:
            await interaction.response.send_message("Giveaway not found.", ephemeral=True)
            return

        await session.execute(
            update(Giveaway)
            .where(Giveaway.id == giveaway.id)
            .values(status="ended")
        )
        await session.commit()

    await interaction.response.send_message(f"Giveaway ended. Drawing winners...", ephemeral=True)
    await draw_winners(giveaway.id)


async def draw_winners(giveaway_id):
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(Giveaway).where(Giveaway.id == str(giveaway_id))
        )
        giveaway = result.fetchone()

        if not giveaway or not giveaway.message_id:
            return

        channel = bot.get_channel(int(giveaway.channel_id))
        if not channel:
            return

        try:
            message = await channel.fetch_message(int(giveaway.message_id))
        except discord.NotFound:
            await session.execute(
                update(Giveaway)
                .where(Giveaway.id == str(giveaway_id))
                .values(status="cancelled")
            )
            await session.commit()
            return

        reaction = None
        for r in message.reactions:
            if str(r.emoji) == "🎉":
                reaction = r
                break

        if reaction:
            users = [u for u in await reaction.users().flatten() if not u.bot]
            pool = [u for u in users]
            winners = pool[:min(giveaway.winners_count, len(pool))]

            embed = discord.Embed(
                title="🎉 GIVEAWAY ENDED",
                description=f"**Prize:** {giveaway.prize}\n**Winners:** {', '.join([str(w) for w in winners]) or 'No valid entries'}",
                color=0xFFA500,
            )
            await message.edit(embed=embed, view=None)

            for w in winners:
                try:
                    await w.send(f"🎉 Congratulations! You won: {giveaway.prize}")
                except discord.Forbidden:
                    pass

        await session.execute(
            update(Giveaway)
            .where(Giveaway.id == str(giveaway_id))
            .values(status="completed")
        )
        await session.commit()


@tasks.loop(seconds=30)
async def check_giveaways():
    async with AsyncSessionLocal() as session:
        now = datetime.utcnow()
        result = await session.execute(
            select(Giveaway).where(
                Giveaway.status == "active",
                Giveaway.ends_at <= now,
            )
        )
        ended = result.fetchall()

        for g in ended:
            await session.execute(
                update(Giveaway)
                .where(Giveaway.id == str(g.id))
                .values(status="ended")
            )
            await session.commit()
            await draw_winners(g.id)


if __name__ == "__main__":
    token = os.getenv("DISCORD_TOKEN")
    if not token:
        raise ValueError("DISCORD_TOKEN not found in environment")
    bot.run(token)
