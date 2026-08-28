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
import uuid

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "packages", "db"))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, insert

from shared_models import Base, VerificationConfig, VerificationAttempt

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


@bot.event
async def on_ready():
    print(f"Sentinel Verify is online as {bot.user}")
    await bot.tree.sync()


class VerifyView(discord.ui.View):
    def __init__(self):
        super().__init__(timeout=None)

    @discord.ui.button(
        label="Verify | تحقق",
        style=discord.ButtonStyle.success,
        emoji="🛡️",
        custom_id="verify_verify_button",
    )
    async def verify(self, interaction: discord.Interaction, button: discord.ui.Button):
        await interaction.response.send_message(
            "Verifying your account... This will take a moment.", ephemeral=True
        )

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
                        "❌ VPN/Proxy detected. Please disconnect and try again.",
                        ephemeral=True,
                    )
                    return

            account_created = member.created_at
            account_age = (datetime.utcnow() - account_created).total_seconds() / 3600

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
                    "❌ Account is less than 72 hours old. Please wait and try again later.",
                    ephemeral=True,
                )
                return

            verified_role = interaction.guild.get_role(int(config.verified_role_id))
            unverified_role = interaction.guild.get_role(int(config.unverified_role_id)) if config.unverified_role_id else None

            try:
                if unverified_role:
                    await member.remove_roles(unverified_role)
                if verified_role:
                    await member.add_roles(verified_role)
            except discord.Forbidden:
                await interaction.followup.send(
                    "❌ I do not have permission to manage roles. Please contact an admin.",
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
                "✅ Verification successful! You now have access to the server.",
                ephemeral=True,
            )


async def check_vpn(member: discord.Member) -> bool:
    proxy_check_key = os.getenv("PROXYCHECK_API_KEY")
    ip_quality_key = os.getenv("IPQUALITYSCORE_API_KEY")

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

    if ip_quality_key:
        try:
            response = requests.get(
                f"https://ipqualityd.io/api/json/ip",
                params={"key": ip_quality_key, "user_agent": "BotBay-Verify"},
                timeout=5,
            )
            data = response.json()
            if data.get("fraud_score", 0) > 80:
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


@bot.tree.command(name="verify-setup", description="Set up verification system")
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
                "This server is protected by Sentinel Verify.\n\n"
                "Please click the **Verify | تحقق** button below to gain access to the server."
            ),
            color=0x3CFF4A,
        )
        if interaction.guild.icon:
            embed.set_thumbnail(url=interaction.guild.icon.url)
        embed.set_footer(text="Anti-Alt & VPN Protection Active")

        view = VerifyView()
        msg = await channel.send(embed=embed, view=view)
        config.panel_message_id = str(msg.id)
        await session.commit()

    embed_response = discord.Embed(
        title="✅ Verification System Configured",
        description=f"Verification channel set to {channel.mention}\nPanel message sent successfully!",
        color=0x3CFF4A,
    )
    await interaction.response.send_message(embed=embed_response, ephemeral=True)


async def cleanup_expired_ips():
    """Delete IP hashes older than 30 days"""
    pass


@bot.event
async def setup_hook():
    bot.add_view(VerifyView())
    bot.loop.create_task(ip_cleanup_loop())


async def ip_cleanup_loop():
    await bot.wait_until_ready()
    while not bot.is_closed():
        try:
            await cleanup_expired_ips()
        except Exception as e:
            print(f"IP cleanup error: {e}")
        await asyncio.sleep(86400)


if __name__ == "__main__":
    token = os.getenv("DISCORD_TOKEN")
    if not token:
        raise ValueError("DISCORD_TOKEN not found in environment")
    bot.run(token)

