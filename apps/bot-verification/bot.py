import os
import sys
import hashlib
import requests
from datetime import datetime, timedelta
from dotenv import load_dotenv
import discord
from discord import app_commands
from discord.ext import commands
import asyncio

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "packages", "db"))
from shared_models import Base, VerificationConfig, VerificationAttempt, Guild, GuildBot, Bot

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///../../bot-bay.db")
connect_args = {"ssl": "require"} if DATABASE_URL.startswith("postgresql") else {}
engine = create_async_engine(DATABASE_URL, echo=False, connect_args=connect_args)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

intents = discord.Intents.default()
intents.members = True
intents.message_content = True
intents.guilds = True

bot = commands.Bot(command_prefix="!", intents=intents)


async def sync_guild_presence():
    """Register verification bot in guild_bots for all connected servers."""
    async with AsyncSessionLocal() as session:
        bot_row = await session.execute(select(Bot).where(Bot.slug == "verification"))
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
    print(f"Sentinel Verify is online as {bot.user}")
    await sync_guild_presence()
    await bot.tree.sync()


@bot.event
async def on_guild_join(guild: discord.Guild):
    await sync_guild_presence()


class VerifyView(discord.ui.View):
    def __init__(self):
        super().__init__(timeout=None)

    @discord.ui.button(
        label="Verify",
        style=discord.ButtonStyle.success,
        emoji="🛡️",
        custom_id="verify_verify_button",
    )
    async def verify(self, interaction: discord.Interaction, button: discord.ui.Button):
        await interaction.response.defer(ephemeral=True)
        member = interaction.user

        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(VerificationConfig).where(VerificationConfig.guild_id == str(interaction.guild_id))
            )
            config = result.scalar_one_or_none()
            if not config:
                await interaction.followup.send(
                    "❌ Verification is not configured for this server yet.", ephemeral=True
                )
                return

            ip_hash = hashlib.sha256(
                f"{interaction.guild_id}:{member.id}".encode()
            ).hexdigest()[:32]

            if config.vpn_check_enabled:
                vpn_detected = await check_vpn(member)
                if vpn_detected:
                    attempt = VerificationAttempt(
                        guild_id=str(config.guild_id),
                        user_id=str(member.id),
                        status="failed_vpn",
                        ip_hash=ip_hash,
                        fingerprint_hash=None,
                    )
                    session.add(attempt)
                    await session.commit()
                    await interaction.followup.send(
                        "❌ VPN or Proxy detected. Please disconnect and try again.",
                        ephemeral=True,
                    )
                    return

            account_created = member.created_at
            account_age = (datetime.utcnow() - account_created.replace(tzinfo=None)).total_seconds() / 3600

            if config.alt_check_enabled and account_age < 72:
                attempt = VerificationAttempt(
                    guild_id=str(config.guild_id),
                    user_id=str(member.id),
                    status="failed_alt",
                    ip_hash=ip_hash,
                    fingerprint_hash=None,
                )
                session.add(attempt)
                await session.commit()
                await interaction.followup.send(
                    "❌ Your Discord account is too new (< 72 hours old). Access denied.",
                    ephemeral=True,
                )
                return

            verified_role = interaction.guild.get_role(int(config.verified_role_id)) if config.verified_role_id else None
            unverified_role = interaction.guild.get_role(int(config.unverified_role_id)) if config.unverified_role_id else None

            try:
                if unverified_role:
                    await member.remove_roles(unverified_role)
                if verified_role:
                    await member.add_roles(verified_role)
            except discord.Forbidden:
                await interaction.followup.send(
                    "❌ I do not have permission to manage roles. Please contact a server admin.",
                    ephemeral=True,
                )
                return

            attempt = VerificationAttempt(
                guild_id=str(config.guild_id),
                user_id=str(member.id),
                status="success",
                ip_hash=ip_hash,
                fingerprint_hash=None,
            )
            session.add(attempt)
            await session.commit()

            await interaction.followup.send(
                "✅ Verification successful! You now have full access to the server.",
                ephemeral=True,
            )


async def check_vpn(member: discord.Member) -> bool:
    proxy_check_key = os.getenv("PROXYCHECK_API_KEY")
    if proxy_check_key:
        try:
            response = requests.get(
                f"https://api.proxycheck.io/v2/{member.id}",
                params={"key": proxy_check_key, "vpn": "1", "proxy": "1"},
                timeout=5,
            )
            data = response.json()
            if data.get("status") == "ok" and data.get(str(member.id), {}).get("proxy") == "yes":
                return True
        except Exception:
            pass
    return False


@bot.event
async def on_member_join(member: discord.Member):
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(VerificationConfig).where(VerificationConfig.guild_id == str(member.guild.id))
        )
        config = result.scalar_one_or_none()

        if config and config.unverified_role_id:
            unverified_role = member.guild.get_role(int(config.unverified_role_id))
            if unverified_role:
                try:
                    await member.add_roles(unverified_role)
                except discord.Forbidden:
                    pass


@bot.tree.command(name="verify-setup", description="Deploy the verification security panel")
@app_commands.checks.has_permissions(administrator=True)
async def verify_setup(
    interaction: discord.Interaction,
    channel: discord.TextChannel,
    unverified_role: discord.Role,
    verified_role: discord.Role,
):
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(VerificationConfig).where(VerificationConfig.guild_id == str(interaction.guild_id))
        )
        config = result.scalar_one_or_none()
        if not config:
            config = VerificationConfig(
                guild_id=str(interaction.guild_id),
                verify_channel_id=str(channel.id),
                unverified_role_id=str(unverified_role.id),
                verified_role_id=str(verified_role.id),
                vpn_check_enabled=True,
                alt_check_enabled=True,
            )
            session.add(config)
        else:
            config.verify_channel_id = str(channel.id)
            config.unverified_role_id = str(unverified_role.id)
            config.verified_role_id = str(verified_role.id)

        await session.commit()

        embed = discord.Embed(
            title="🛡️ Server Verification Required",
            description=(
                f"Welcome to **{interaction.guild.name}**!\n\n"
                "This server is protected by Sentinel Verify security.\n"
                "Please click the **Verify** button below to complete verification and unlock server channels."
            ),
            color=0x3CFF4A,
        )
        if interaction.guild.icon:
            embed.set_thumbnail(url=interaction.guild.icon.url)
        embed.set_footer(text="Anti-Alt & VPN Protection Active • Sentinel Security")

        view = VerifyView()
        msg = await channel.send(embed=embed, view=view)
        config.panel_message_id = str(msg.id)
        await session.commit()

    embed_response = discord.Embed(
        title="✅ Verification Panel Deployed",
        description=f"Verification channel: {channel.mention}\nUnverified Role: {unverified_role.mention}\nVerified Role: {verified_role.mention}",
        color=0x3CFF4A,
    )
    await interaction.response.send_message(embed=embed_response, ephemeral=True)


@bot.event
async def setup_hook():
    bot.add_view(VerifyView())


if __name__ == "__main__":
    token = os.getenv("DISCORD_TOKEN")
    if not token:
        raise ValueError("DISCORD_TOKEN not found in environment")
    bot.run(token)
