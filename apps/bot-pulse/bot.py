import os
import sys
from datetime import datetime, timezone

import discord
from discord import app_commands
from discord.ext import commands
from dotenv import load_dotenv
from sqlalchemy import select

load_dotenv()

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, ROOT)
from shared.db.models import ChannelStat, DailyStat, MemberStat, PulseConfig
from shared.db.session import Session, init_db

intents = discord.Intents.default()
intents.guilds = True
intents.messages = True
intents.voice_states = True
bot = commands.Bot(command_prefix="!", intents=intents)


async def daily(session, guild_id: str) -> DailyStat:
    today = datetime.now(timezone.utc).date().isoformat()
    row = await session.scalar(select(DailyStat).where(DailyStat.guild_id == guild_id, DailyStat.date == today))
    if not row:
        row = DailyStat(guild_id=guild_id, date=today)
        session.add(row)
    else:
        row.new_members = row.new_members or 0
        row.messages_count = row.messages_count or 0
        row.active_users = row.active_users or 0
        row.voice_minutes = row.voice_minutes or 0
    return row


async def enabled_for(session, guild_id: str) -> bool:
    config = await session.scalar(select(PulseConfig).where(PulseConfig.guild_id == guild_id))
    return config.enabled if config else True


@bot.event
async def on_ready():
    await init_db()
    await bot.tree.sync()
    print(f"Pulse online as {bot.user}")


@bot.event
async def setup_hook():
    bot.add_view(PulsePanel())


async def overview_embed(guild: discord.Guild) -> discord.Embed:
    async with Session() as session:
        stat = await daily(session, str(guild.id))
        rows = (await session.scalars(select(MemberStat).where(MemberStat.guild_id == str(guild.id)))).all()
    active_count = sum(1 for row in rows if row.last_active_at and (datetime.utcnow() - row.last_active_at).days < 1)
    embed = discord.Embed(title="Pulse | Server overview", color=0x58C8A5)
    embed.add_field(name="Members", value=f"{guild.member_count:,}")
    embed.add_field(name="New members", value=f"+{stat.new_members:,}")
    embed.add_field(name="Messages", value=f"{stat.messages_count:,}")
    embed.add_field(name="Active users", value=f"{active_count:,}")
    return embed


class PulsePanel(discord.ui.View):
    def __init__(self):
        super().__init__(timeout=None)

    @discord.ui.button(label="Overview", style=discord.ButtonStyle.success, emoji="📊", custom_id="pulse_overview")
    async def overview(self, interaction: discord.Interaction, button: discord.ui.Button):
        await interaction.response.edit_message(embed=await overview_embed(interaction.guild))

    @discord.ui.button(label="Top members", style=discord.ButtonStyle.secondary, emoji="🏆", custom_id="pulse_members")
    async def members(self, interaction: discord.Interaction, button: discord.ui.Button):
        async with Session() as session:
            rows = (await session.scalars(select(MemberStat).where(MemberStat.guild_id == str(interaction.guild_id)).order_by(MemberStat.message_count.desc()).limit(10))).all()
        text = "\n".join(f"**{index}.** <@{row.user_id}> — `{row.message_count:,} messages`" for index, row in enumerate(rows, 1)) or "No activity recorded yet."
        await interaction.response.edit_message(embed=discord.Embed(title="Pulse | Most active members", description=text, color=0x58C8A5))

    @discord.ui.button(label="Refresh", style=discord.ButtonStyle.primary, emoji="🔁", custom_id="pulse_refresh")
    async def refresh(self, interaction: discord.Interaction, button: discord.ui.Button):
        await interaction.response.edit_message(embed=await overview_embed(interaction.guild))


@bot.tree.command(name="pulse-panel", description="Post the Pulse analytics button panel")
@app_commands.checks.has_permissions(manage_guild=True)
async def pulse_panel(interaction: discord.Interaction):
    await interaction.channel.send(embed=await overview_embed(interaction.guild), view=PulsePanel())
    await interaction.response.send_message(embed=discord.Embed(title="Pulse panel ready", description="Analytics controls were posted in this channel.", color=0x58C8A5), ephemeral=True)


@bot.event
async def on_message(message: discord.Message):
    if not message.guild or message.author.bot:
        return
    now = datetime.utcnow()
    async with Session() as session:
        if not await enabled_for(session, str(message.guild.id)):
            return
        member = await session.scalar(select(MemberStat).where(MemberStat.guild_id == str(message.guild.id), MemberStat.user_id == str(message.author.id)))
        if not member:
            member = MemberStat(guild_id=str(message.guild.id), user_id=str(message.author.id))
            session.add(member)
        member.message_count += 1
        member.last_active_at = now
        stat = await daily(session, str(message.guild.id))
        stat.messages_count += 1
        channel = await session.scalar(select(ChannelStat).where(ChannelStat.guild_id == str(message.guild.id), ChannelStat.channel_id == str(message.channel.id), ChannelStat.date == stat.date))
        if not channel:
            channel = ChannelStat(guild_id=str(message.guild.id), channel_id=str(message.channel.id), date=stat.date)
            session.add(channel)
        channel.message_count += 1
        await session.commit()


@bot.event
async def on_member_join(member: discord.Member):
    async with Session() as session:
        stat = await daily(session, str(member.guild.id))
        stat.new_members += 1
        await session.commit()


@bot.tree.command(name="pulse", description="Show this server's activity snapshot")
async def pulse(interaction: discord.Interaction):
    async with Session() as session:
        stat = await daily(session, str(interaction.guild_id))
        rows = (await session.scalars(select(MemberStat).where(MemberStat.guild_id == str(interaction.guild_id)))).all()
    active_count = sum(1 for row in rows if row.last_active_at and (datetime.utcnow() - row.last_active_at).days < 1)
    embed = discord.Embed(title="Pulse | Server overview", color=0x42D392)
    embed.add_field(name="Members", value=f"{interaction.guild.member_count:,}")
    embed.add_field(name="New members", value=f"+{stat.new_members:,}")
    embed.add_field(name="Messages", value=f"{stat.messages_count:,}")
    embed.add_field(name="Active users", value=f"{active_count:,}")
    await interaction.response.send_message(embed=embed)


if __name__ == "__main__":
    token = os.getenv("DISCORD_TOKEN")
    if not token:
        raise ValueError("DISCORD_TOKEN not found in environment")
    bot.run(token)