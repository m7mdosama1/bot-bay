import os
from datetime import datetime, timedelta
from dotenv import load_dotenv
import discord
from discord import app_commands
from discord.ext import commands

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import insert

import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "packages", "db"))
from shared_models import ModerationLog

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///../../bot-bay.db")
engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

intents = discord.Intents.default()
intents.message_content = True
intents.guilds = True
intents.members = True

bot = commands.Bot(command_prefix="!", intents=intents)


@bot.event
async def on_ready():
    print(f"Iron Gavel is online as {bot.user}")
    await bot.tree.sync()


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

    @discord.ui.button(label="Confirm", style=discord.ButtonStyle.danger, emoji="✅")
    async def confirm(self, interaction: discord.Interaction, button: discord.ui.Button):
        if interaction.user.id != self.moderator.id:
            await interaction.response.send_message("Only the moderator who initiated this can confirm.", ephemeral=True)
            return

        try:
            if self.action == "ban":
                await self.target.ban(reason=self.reason or "No reason provided")
                msg = f"✅ Banned {self.target.mention}"
            elif self.action == "kick":
                await self.target.kick(reason=self.reason or "No reason provided")
                msg = f"✅ Kicked {self.target.mention}"
            elif self.action == "mute":
                await self.target.timeout(timedelta(hours=1), reason=self.reason or "No reason provided")
                msg = f"✅ Muted {self.target.mention} for 1 hour"
            elif self.action == "warn":
                msg = f"⚠️ Warned {self.target.mention}"

            await log_moderation(
                str(self.target.guild.id),
                self.action,
                self.target.id,
                self.moderator.id,
                self.reason,
            )

            await interaction.response.send_message(msg, ephemeral=True)
        except discord.Forbidden:
            await interaction.response.send_message("❌ I don't have permission to do that.", ephemeral=True)
        except Exception as e:
            await interaction.response.send_message(f"❌ Error: {e}", ephemeral=True)

        self.stop()

    @discord.ui.button(label="Cancel", style=discord.ButtonStyle.secondary, emoji="❌")
    async def cancel(self, interaction: discord.Interaction, button: discord.ui.Button):
        await interaction.response.send_message("❌ Action cancelled.", ephemeral=True)
        self.stop()

    async def on_timeout(self):
        pass


@bot.tree.command(name="ban", description="Ban a member")
@app_commands.checks.has_permissions(ban_members=True)
async def ban(
    interaction: discord.Interaction,
    target: discord.Member,
    reason: str = None,
):
    view = ConfirmView("ban", target, interaction.user, reason)
    embed = discord.Embed(
        title="⚠️ Confirm Ban",
        description=f"Ban {target.mention} from the server?\nReason: {reason or 'None'}",
        color=0xEF4444,
    )
    await interaction.response.send_message(embed=embed, view=view, ephemeral=True)


@bot.tree.command(name="kick", description="Kick a member")
@app_commands.checks.has_permissions(kick_members=True)
async def kick(
    interaction: discord.Interaction,
    target: discord.Member,
    reason: str = None,
):
    view = ConfirmView("kick", target, interaction.user, reason)
    embed = discord.Embed(
        title="⚠️ Confirm Kick",
        description=f"Kick {target.mention} from the server?\nReason: {reason or 'None'}",
        color=0xF59E0B,
    )
    await interaction.response.send_message(embed=embed, view=view, ephemeral=True)


@bot.tree.command(name="mute", description="Mute a member")
@app_commands.checks.has_permissions(moderate_members=True)
async def mute(
    interaction: discord.Interaction,
    target: discord.Member,
    reason: str = None,
):
    view = ConfirmView("mute", target, interaction.user, reason)
    embed = discord.Embed(
        title="⚠️ Confirm Mute",
        description=f"Mute {target.mention} for 1 hour?\nReason: {reason or 'None'}",
        color=0xE5E7EB,
    )
    await interaction.response.send_message(embed=embed, view=view, ephemeral=True)


@bot.tree.command(name="warn", description="Warn a member")
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
        title="⚠️ Warning",
        description=f"{target.mention} has been warned.\nReason: {reason}",
        color=0xF59E0B,
    )
    await interaction.response.send_message(embed=embed, ephemeral=True)


@bot.tree.command(name="warnings", description="Check warnings for a member")
@app_commands.checks.has_permissions(manage_messages=True)
async def warnings(interaction: discord.Interaction, target: discord.Member):
    async with AsyncSessionLocal() as session:
        from sqlalchemy import select
        result = await session.execute(
            select(ModerationLog).where(
                ModerationLog.c.guild_id == str(interaction.guild_id),
                ModerationLog.c.target_user_id == str(target.id),
            )
        )
        logs = result.fetchall()

    warning_count = len(logs)
    embed = discord.Embed(
        title=f"⚠️ Warnings for {target.display_name}",
        color=0xF59E0B,
    )
    embed.add_field(name="Total Warnings", value=str(warning_count), inline=False)

    if logs:
        log_text = "\n".join([
            f"{'⚠' if l.action == 'warn' else l.action} - {l.reason or 'N/A'} - <t:{int(l.created_at.timestamp())}:R>"
            for l in logs
        ])
        embed.add_field(name="History", value=log_text, inline=False)

    await interaction.response.send_message(embed=embed, ephemeral=True)


@bot.tree.command(name="modlog", description="View recent moderation logs")
@app_commands.checks.has_permissions(administrator=True)
async def modlog(interaction: discord.Interaction, limit: int = 10):
    async with AsyncSessionLocal() as session:
        from sqlalchemy import select
        result = await session.execute(
            select(ModerationLog)
            .where(ModerationLog.c.guild_id == str(interaction.guild_id))
            .order_by(ModerationLog.c.created_at.desc())
            .limit(limit)
        )
        logs = result.fetchall()

    embed = discord.Embed(
        title="📋 Recent Moderation Logs",
        color=0x3B82F6,
    )

    if not logs:
        embed.description = "No moderation logs yet."
    else:
        for log in logs:
            embed.add_field(
                name=f"{log.action.capitalize()} - {log.target_user_id}",
                value=f"Mod: {log.moderator_id}\nReason: {log.reason or 'N/A'}\nTime: <t:{int(log.created_at.timestamp())}:R>",
                inline=False,
            )

    await interaction.response.send_message(embed=embed, ephemeral=True)


if __name__ == "__main__":
    token = os.getenv("DISCORD_TOKEN")
    if not token:
        raise ValueError("DISCORD_TOKEN not found in environment")
    bot.run(token)
