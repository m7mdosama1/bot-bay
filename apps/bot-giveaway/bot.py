import os
import sys
import asyncio
import random as random_module
from datetime import datetime, timedelta
from dotenv import load_dotenv
import discord
from discord import app_commands
from discord.ext import commands, tasks

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, update

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "packages", "db"))
from shared_models import Giveaway, Guild, GuildBot, Bot

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///../../bot-bay.db")
connect_args = {"ssl": "require"} if DATABASE_URL.startswith("postgresql") else {}
engine = create_async_engine(DATABASE_URL, echo=False, connect_args=connect_args)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

intents = discord.Intents.default()
intents.message_content = True
intents.guilds = True

bot = commands.Bot(command_prefix="!", intents=intents)


async def sync_guild_presence():
    """Register bot in guild_bots for all connected servers."""
    async with AsyncSessionLocal() as session:
        bot_row = await session.execute(select(Bot).where(Bot.slug == "giveaway"))
        db_bot = bot_row.scalar_one_or_none()
        if not db_bot:
            return

        for guild in bot.guilds:
            # Ensure guild exists
            g_res = await session.execute(select(Guild).where(Guild.id == str(guild.id)))
            g_obj = g_res.scalar_one_or_none()
            icon_url = guild.icon.url if guild.icon else None
            if not g_obj:
                session.add(Guild(id=str(guild.id), name=guild.name, icon_url=icon_url, owner_id=str(guild.owner_id)))
            else:
                g_obj.name = guild.name
                g_obj.icon_url = icon_url

            # Ensure guild_bot entry
            gb_res = await session.execute(
                select(GuildBot).where(GuildBot.guild_id == str(guild.id), GuildBot.bot_id == db_bot.id)
            )
            gb_obj = gb_res.scalar_one_or_none()
            if not gb_obj:
                session.add(GuildBot(guild_id=str(guild.id), bot_id=db_bot.id, is_active=True))
            else:
                gb_obj.is_active = True

        await session.commit()


@bot.event
async def on_ready():
    print(f"Bounty Drop (Giveaway) is online as {bot.user}")
    await sync_guild_presence()
    await bot.tree.sync()
    if not check_giveaways_loop.is_running():
        check_giveaways_loop.start()


@bot.event
async def on_guild_join(guild: discord.Guild):
    await sync_guild_presence()


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


def create_giveaway_embed(prize: str, winners: int, ends_at: datetime, count: int = 0) -> discord.Embed:
    embed = discord.Embed(
        title="🎁 NEW GIVEAWAY!",
        description=(
            f"**Prize:** {prize}\n"
            f"**Winners:** {winners}\n"
            f"**Ends:** <t:{int(ends_at.timestamp())}:R> (<t:{int(ends_at.timestamp())}:f>)\n\n"
            f"Click the button below to enter or leave the giveaway!"
        ),
        color=0xF2A93B,
    )
    embed.set_footer(text=f"Participants: {count} • Bounty Drop System")
    return embed


class GiveawayView(discord.ui.View):
    def __init__(self):
        super().__init__(timeout=None)

    @discord.ui.button(
        label="🎉 Enter Giveaway",
        style=discord.ButtonStyle.success,
        custom_id="giveaway_join",
    )
    async def join(self, interaction: discord.Interaction, button: discord.ui.Button):
        message_id = str(interaction.message.id)
        user_id = str(interaction.user.id)

        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(Giveaway).where(Giveaway.message_id == message_id)
            )
            giveaway = result.scalar_one_or_none()
            if not giveaway:
                await interaction.response.send_message("❌ This giveaway was not found in database.", ephemeral=True)
                return

            if giveaway.status != "active":
                await interaction.response.send_message("❌ This giveaway has already ended.", ephemeral=True)
                return

            participants_list = [p for p in (giveaway.participants or "").split(",") if p.strip()]

            if user_id in participants_list:
                participants_list.remove(user_id)
                giveaway.participants = ",".join(participants_list)
                await session.commit()
                await interaction.response.send_message("❌ You have left the giveaway.", ephemeral=True)
            else:
                participants_list.append(user_id)
                giveaway.participants = ",".join(participants_list)
                await session.commit()
                await interaction.response.send_message("🎉 You have entered the giveaway! Good luck!", ephemeral=True)

            count = len(participants_list)
            embed = interaction.message.embeds[0]
            embed.set_footer(text=f"Participants: {count} • Bounty Drop System")

            view = GiveawayView()
            view.children[0].label = f"🎉 Enter Giveaway ({count})"
            await interaction.message.edit(embed=embed, view=view)


@bot.tree.command(name="giveaway_create", description="Create and host a new giveaway")
@app_commands.describe(prize="Prize to give away", winners="Number of winners", duration="Duration (e.g. 1d 12h 30m)")
@app_commands.checks.has_permissions(administrator=True)
async def giveaway_create(
    interaction: discord.Interaction,
    prize: str,
    winners: int = 1,
    duration: str = "24h",
):
    duration_seconds = parse_duration(duration)
    if duration_seconds <= 0:
        await interaction.response.send_message("Invalid duration format. Example: `1h 30m` or `24h`", ephemeral=True)
        return

    ends_at = datetime.utcnow() + timedelta(seconds=duration_seconds)
    await interaction.response.defer(ephemeral=True)

    async with AsyncSessionLocal() as session:
        new_g = Giveaway(
            guild_id=str(interaction.guild_id),
            channel_id=str(interaction.channel_id),
            prize=prize,
            winners_count=winners,
            ends_at=ends_at,
            status="active",
            created_by=str(interaction.user.id),
            participants=""
        )
        session.add(new_g)
        await session.commit()

        embed = create_giveaway_embed(prize, winners, ends_at, 0)
        view = GiveawayView()
        msg = await interaction.channel.send(embed=embed, view=view)

        new_g.message_id = str(msg.id)
        await session.commit()

    await interaction.followup.send("✅ Giveaway created and posted successfully!", ephemeral=True)


@bot.tree.command(name="giveaway_end", description="End a giveaway early and pick winners")
@app_commands.checks.has_permissions(administrator=True)
async def giveaway_end(interaction: discord.Interaction, message_id: str):
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(Giveaway).where(Giveaway.message_id == message_id)
        )
        giveaway = result.scalar_one_or_none()

        if not giveaway:
            await interaction.response.send_message("❌ Giveaway not found.", ephemeral=True)
            return

        giveaway.status = "ended"
        await session.commit()
        giveaway_id = giveaway.id

    await interaction.response.send_message("Drawing winners...", ephemeral=True)
    await draw_winners(giveaway_id)


async def draw_winners(giveaway_id: str):
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(Giveaway).where(Giveaway.id == str(giveaway_id))
        )
        giveaway = result.scalar_one_or_none()

        if not giveaway or not giveaway.message_id:
            return

        channel = bot.get_channel(int(giveaway.channel_id))
        if not channel:
            return

        try:
            message = await channel.fetch_message(int(giveaway.message_id))
        except discord.NotFound:
            giveaway.status = "cancelled"
            await session.commit()
            return

        participants_list = [p for p in (giveaway.participants or "").split(",") if p.strip()]
        winners_ids = []
        if participants_list:
            winners_ids = random_module.sample(participants_list, min(giveaway.winners_count, len(participants_list)))

        winners_mentions = [f"<@{uid}>" for uid in winners_ids]

        embed = discord.Embed(
            title="🎉 GIVEAWAY ENDED!",
            description=(
                f"**Prize:** {giveaway.prize}\n"
                f"**Winners:** {', '.join(winners_mentions) if winners_mentions else 'No valid participants'}\n\n"
                f"Congratulations to the winners!"
            ),
            color=0xF2A93B,
        )
        embed.set_footer(text="Bounty Drop System")
        await message.edit(embed=embed, view=None)

        if winners_mentions:
            await channel.send(f"🎉 Congratulations {', '.join(winners_mentions)}! You won **{giveaway.prize}**!")

        for uid in winners_ids:
            try:
                user = await bot.fetch_user(int(uid))
                if user:
                    await user.send(f"🎉 Congratulations! You won **{giveaway.prize}** in **{message.guild.name}**!")
            except Exception:
                pass

        giveaway.status = "completed"
        await session.commit()


@tasks.loop(seconds=5)
async def check_giveaways_loop():
    """Checks for newly created web giveaways to post them, and ends expired giveaways."""
    async with AsyncSessionLocal() as session:
        # 1. Dispatch newly created giveaways from Web Dashboard
        new_res = await session.execute(
            select(Giveaway).where(
                Giveaway.status == "active",
                Giveaway.message_id.is_(None),
            )
        )
        new_giveaways = new_res.scalars().all()

        for g in new_giveaways:
            try:
                channel = bot.get_channel(int(g.channel_id))
                if channel:
                    embed = create_giveaway_embed(g.prize, g.winners_count, g.ends_at, 0)
                    view = GiveawayView()
                    msg = await channel.send(embed=embed, view=view)
                    g.message_id = str(msg.id)
                    await session.commit()
            except Exception as e:
                print(f"Error dispatching web giveaway {g.id}: {e}")

        # 2. End expired giveaways or dashboard-ended giveaways
        now = datetime.utcnow()
        ended_res = await session.execute(
            select(Giveaway).where(
                ((Giveaway.status == "active") & (Giveaway.ends_at <= now)) |
                (Giveaway.status == "ended")
            )
        )
        ended = ended_res.scalars().all()

        for g in ended:
            g.status = "processing"
            await session.commit()
            await draw_winners(g.id)


@bot.event
async def setup_hook():
    bot.add_view(GiveawayView())


if __name__ == "__main__":
    token = os.getenv("DISCORD_TOKEN")
    if not token:
        raise ValueError("DISCORD_TOKEN not found in environment")
    bot.run(token)
