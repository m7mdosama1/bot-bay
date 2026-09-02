import os
import random
import sys
from datetime import datetime, timedelta, timezone

import discord
from discord import app_commands
from discord.ext import commands
from dotenv import load_dotenv
from sqlalchemy import select

load_dotenv()

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, ROOT)
from shared.db.models import AscendConfig, LevelRole, UserXP
from shared.db.session import Session, init_db

intents = discord.Intents.default()
intents.guilds = True
intents.messages = True
intents.members = True
bot = commands.Bot(command_prefix="!", intents=intents)
XP_COOLDOWN_SECONDS = int(os.getenv("XP_COOLDOWN_SECONDS", "60"))
XP_PER_MESSAGE_MIN = int(os.getenv("XP_PER_MESSAGE_MIN", "15"))
XP_PER_MESSAGE_MAX = int(os.getenv("XP_PER_MESSAGE_MAX", "25"))


def xp_required(level: int) -> int:
    return 5 * level * level + 50 * level + 100


async def user_record(session, guild_id: str, user_id: str) -> UserXP:
    row = await session.scalar(select(UserXP).where(UserXP.guild_id == guild_id, UserXP.user_id == user_id))
    if not row:
        row = UserXP(guild_id=guild_id, user_id=user_id)
        session.add(row)
    return row


async def config_for(session, guild_id: str) -> AscendConfig:
    config = await session.scalar(select(AscendConfig).where(AscendConfig.guild_id == guild_id))
    return config or AscendConfig(guild_id=guild_id, enabled=True, xp_cooldown_seconds=XP_COOLDOWN_SECONDS, xp_per_message_min=XP_PER_MESSAGE_MIN, xp_per_message_max=XP_PER_MESSAGE_MAX)


@bot.event
async def on_ready():
    await init_db()
    await bot.tree.sync()
    print(f"Ascend online as {bot.user}")


@bot.event
async def setup_hook():
    bot.add_view(AscendPanel())


class AscendPanel(discord.ui.View):
    def __init__(self):
        super().__init__(timeout=None)

    @discord.ui.button(label="My rank", style=discord.ButtonStyle.success, emoji="★", custom_id="ascend_rank")
    async def my_rank(self, interaction: discord.Interaction, button: discord.ui.Button):
        async with Session() as session:
            row = await user_record(session, str(interaction.guild_id), str(interaction.user.id))
        embed = discord.Embed(title="ASCEND | Your rank", description=f"{interaction.user.mention}\nLevel **{row.level}**", color=0xDCA85D)
        embed.add_field(name="XP", value=f"{row.xp:,} / {xp_required(row.level + 1):,}")
        embed.add_field(name="Streak", value=f"{row.streak_days} days")
        await interaction.response.send_message(embed=embed, ephemeral=True)

    @discord.ui.button(label="Leaderboard", style=discord.ButtonStyle.secondary, emoji="♛", custom_id="ascend_leaderboard")
    async def leaderboard_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        async with Session() as session:
            rows = (await session.scalars(select(UserXP).where(UserXP.guild_id == str(interaction.guild_id)).order_by(UserXP.xp.desc()).limit(10))).all()
        text = "\n".join(f"**{index}.** <@{row.user_id}> — `{row.xp:,} XP` (Lv {row.level})" for index, row in enumerate(rows, 1)) or "No XP earned yet."
        await interaction.response.send_message(embed=discord.Embed(title="Ascend leaderboard", description=text, color=0xDCA85D), ephemeral=True)


@bot.tree.command(name="ascend-panel", description="Post the Ascend button panel")
@app_commands.checks.has_permissions(manage_guild=True)
async def ascend_panel(interaction: discord.Interaction):
    embed = discord.Embed(title="ASCEND", description="Earn XP by participating, then use the buttons to check your progress.", color=0xDCA85D)
    await interaction.channel.send(embed=embed, view=AscendPanel())
    await interaction.response.send_message(embed=discord.Embed(title="Ascend panel ready", description="XP controls were posted in this channel.", color=0x58C8A5), ephemeral=True)


@bot.event
async def on_message(message: discord.Message):
    if not message.guild or message.author.bot:
        return
    now = datetime.utcnow()
    async with Session() as session:
        config = await config_for(session, str(message.guild.id))
        if not config.enabled:
            return
        row = await user_record(session, str(message.guild.id), str(message.author.id))
        if row.last_xp_at and (now - row.last_xp_at).total_seconds() < config.xp_cooldown_seconds:
            return
        row.xp += random.randint(config.xp_per_message_min, config.xp_per_message_max)
        row.message_count += 1
        row.last_xp_at = now
        today = datetime.now(timezone.utc).date().isoformat()
        if row.last_active_date != today:
            previous = datetime.fromisoformat(row.last_active_date).date() if row.last_active_date else None
            row.streak_days = row.streak_days + 1 if previous == datetime.now(timezone.utc).date() - timedelta(days=1) else 1
            row.last_active_date = today
        while row.xp >= xp_required(row.level + 1):
            row.level += 1
            role_row = await session.scalar(select(LevelRole).where(LevelRole.guild_id == str(message.guild.id), LevelRole.level == row.level))
            role = message.guild.get_role(int(role_row.role_id)) if role_row else None
            if role:
                await message.author.add_roles(role)
        await session.commit()


@bot.tree.command(name="rank", description="Show your Ascend rank")
async def rank(interaction: discord.Interaction, member: discord.Member | None = None):
    member = member or interaction.user
    async with Session() as session:
        row = await user_record(session, str(interaction.guild_id), str(member.id))
        higher = await session.scalar(select(UserXP).where(UserXP.guild_id == str(interaction.guild_id), UserXP.xp > row.xp))
    embed = discord.Embed(title="ASCEND", description=f"{member.mention}\nLevel **{row.level}** | Prestige **{row.prestige}**", color=0xF2A93B)
    embed.add_field(name="XP", value=f"{row.xp:,} / {xp_required(row.level + 1):,}")
    embed.add_field(name="Streak", value=f"{row.streak_days} days")
    embed.set_thumbnail(url=member.display_avatar.url)
    await interaction.response.send_message(embed=embed)


@bot.tree.command(name="leaderboard", description="Show the server XP leaderboard")
async def leaderboard(interaction: discord.Interaction):
    async with Session() as session:
        rows = (await session.scalars(select(UserXP).where(UserXP.guild_id == str(interaction.guild_id)).order_by(UserXP.xp.desc()).limit(10))).all()
    description = "\n".join(f"**{index}.** <@{row.user_id}> — `{row.xp:,} XP` (Lv {row.level})" for index, row in enumerate(rows, 1)) or "No XP earned yet."
    await interaction.response.send_message(embed=discord.Embed(title="Ascend leaderboard", description=description, color=0xF2A93B))


if __name__ == "__main__":
    token = os.getenv("DISCORD_TOKEN")
    if not token:
        raise ValueError("DISCORD_TOKEN not found in environment")
    bot.run(token)