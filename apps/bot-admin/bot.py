import os
from datetime import datetime, timedelta
from dotenv import load_dotenv
import discord
from discord import app_commands
from discord.ext import commands

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import insert, select

import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "packages", "db"))
from shared_models import ModerationLog, Guild, GuildBot, Bot

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///../../bot-bay.db")
connect_args = {"ssl": "require"} if DATABASE_URL.startswith("postgresql") else {}
engine = create_async_engine(DATABASE_URL, echo=False, connect_args=connect_args)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

intents = discord.Intents.default()
intents.message_content = True
intents.guilds = True
intents.members = True

bot = commands.Bot(command_prefix="!", intents=intents)


async def sync_guild_presence():
    """Register admin bot in guild_bots for all connected servers."""
    async with AsyncSessionLocal() as session:
        bot_row = await session.execute(select(Bot).where(Bot.slug == "admin"))
        db_bot = bot_row.scalar_one_or_none()
        if not db_bot:
            return

        for guild in bot.guilds:
            g_res = await session.execute(select(Guild).where(Guild.id == str(guild.id)))
            g_obj = g_res.scalar_one_or_none()
            icon_url = guild.icon.url if guild.icon else None
            if not g_obj:
                session.add(Guild(id=str(guild.id), name=guild.name, icon_url=icon_url, owner_id=str(guild.owner_id)))
            else:
                g_obj.name = guild.name
                g_obj.icon_url = icon_url

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
    print(f"Aegis (Admin) is online as {bot.user}")
    await sync_guild_presence()
    await bot.tree.sync()


@bot.event
async def on_guild_join(guild: discord.Guild):
    await sync_guild_presence()


async def log_moderation(guild_id: str, action: str, target_id: str, moderator_id: str, reason: str = None):
    async with AsyncSessionLocal() as session:
        await session.execute(
            insert(ModerationLog).values(
                guild_id=guild_id,
                action=action,
                target_user_id=str(target_id),
                moderator_id=str(moderator_id),
                reason=reason,
            )
        )
        await session.commit()


class ConfirmView(discord.ui.View):
    def __init__(self, action: str, target: discord.Member, moderator: discord.Member, reason: str = None):
        super().__init__(timeout=60)
        self.action = action
        self.target = target
        self.moderator = moderator
        self.reason = reason

    @discord.ui.button(label="Confirm Action", style=discord.ButtonStyle.danger, emoji="✅")
    async def confirm(self, interaction: discord.Interaction, button: discord.ui.Button):
        if interaction.user.id != self.moderator.id:
            await interaction.response.send_message("Only the moderator who initiated this action can confirm.", ephemeral=True)
            return

        try:
            if self.action == "ban":
                await self.target.ban(reason=self.reason or "No reason provided")
                msg = f"🔨 Successfully banned {self.target.mention}"
            elif self.action == "kick":
                await self.target.kick(reason=self.reason or "No reason provided")
                msg = f"👢 Successfully kicked {self.target.mention}"
            elif self.action == "mute":
                await self.target.timeout(timedelta(hours=1), reason=self.reason or "No reason provided")
                msg = f"🔇 Successfully timed out {self.target.mention} for 1 hour"
            elif self.action == "warn":
                msg = f"⚠️ Successfully warned {self.target.mention}"

            await log_moderation(
                str(self.target.guild.id),
                self.action,
                self.target.id,
                self.moderator.id,
                self.reason,
            )

            await interaction.response.send_message(msg, ephemeral=True)
        except discord.Forbidden:
            await interaction.response.send_message("❌ I do not have permission to execute this moderation action.", ephemeral=True)
        except Exception as e:
            await interaction.response.send_message(f"❌ Error executing action: {e}", ephemeral=True)

        self.stop()

    @discord.ui.button(label="Cancel", style=discord.ButtonStyle.secondary, emoji="❌")
    async def cancel(self, interaction: discord.Interaction, button: discord.ui.Button):
        await interaction.response.send_message("Action cancelled.", ephemeral=True)
        self.stop()


@bot.tree.command(name="ban", description="Ban a member from the server")
@app_commands.checks.has_permissions(ban_members=True)
async def ban(
    interaction: discord.Interaction,
    target: discord.Member,
    reason: str = None,
):
    view = ConfirmView("ban", target, interaction.user, reason)
    embed = discord.Embed(
        title="🔨 Confirm Member Ban",
        description=f"Are you sure you want to ban {target.mention}?\n**Reason:** {reason or 'No reason provided'}",
        color=0xEF4444,
    )
    await interaction.response.send_message(embed=embed, view=view, ephemeral=True)


@bot.tree.command(name="kick", description="Kick a member from the server")
@app_commands.checks.has_permissions(kick_members=True)
async def kick(
    interaction: discord.Interaction,
    target: discord.Member,
    reason: str = None,
):
    view = ConfirmView("kick", target, interaction.user, reason)
    embed = discord.Embed(
        title="👢 Confirm Member Kick",
        description=f"Are you sure you want to kick {target.mention}?\n**Reason:** {reason or 'No reason provided'}",
        color=0xF59E0B,
    )
    await interaction.response.send_message(embed=embed, view=view, ephemeral=True)


@bot.tree.command(name="mute", description="Timeout/Mute a member for 1 hour")
@app_commands.checks.has_permissions(moderate_members=True)
async def mute(
    interaction: discord.Interaction,
    target: discord.Member,
    reason: str = None,
):
    view = ConfirmView("mute", target, interaction.user, reason)
    embed = discord.Embed(
        title="🔇 Confirm Timeout",
        description=f"Timeout {target.mention} for 1 hour?\n**Reason:** {reason or 'No reason provided'}",
        color=0xE5E7EB,
    )
    await interaction.response.send_message(embed=embed, view=view, ephemeral=True)


@bot.tree.command(name="warn", description="Issue a formal warning to a member")
@app_commands.checks.has_permissions(manage_messages=True)
async def warn(
    interaction: discord.Interaction,
    target: discord.Member,
    reason: str = "No reason provided",
):
    await log_moderation(
        str(interaction.guild_id),
        "warn",
        target.id,
        interaction.user.id,
        reason,
    )

    embed = discord.Embed(
        title="⚠️ Official Warning Issued",
        description=f"{target.mention} has been issued a warning.\n**Reason:** {reason}",
        color=0xF59E0B,
    )
    await interaction.response.send_message(embed=embed, ephemeral=True)


if __name__ == "__main__":
    token = os.getenv("DISCORD_TOKEN")
    if not token:
        raise ValueError("DISCORD_TOKEN not found in environment")
    bot.run(token)
