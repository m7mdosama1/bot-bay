import hashlib
import os
import secrets
import sys
from datetime import datetime, timedelta

import discord
from discord import app_commands
from discord.ext import commands
from dotenv import load_dotenv
from sqlalchemy import select

load_dotenv()

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, ROOT)
from packages.db.shared_models import RouletteConfig
from shared.db.models import RouletteBalance, RouletteSession
from shared.db.session import Session, init_db

configured_web_url = os.getenv("PUBLIC_WEB_URL", "").strip().rstrip("/")
WEB_URL = configured_web_url if configured_web_url.lower() not in {"", "undefined", "null", "none"} else "https://bot-bay-kappa.vercel.app"
intents = discord.Intents.default()
intents.guilds = True
bot = commands.Bot(command_prefix="!", intents=intents)


def session_hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


async def config_for(session, guild_id: str):
    config = await session.scalar(select(RouletteConfig).where(RouletteConfig.guild_id == guild_id))
    return config or RouletteConfig(guild_id=guild_id, min_bet=10, max_bet=10000, currency_name="Coins", enabled=True)


async def balance_for(session, guild_id: str, user_id: str):
    balance = await session.scalar(select(RouletteBalance).where(RouletteBalance.guild_id == guild_id, RouletteBalance.user_id == user_id))
    if not balance:
        balance = RouletteBalance(guild_id=guild_id, user_id=user_id, balance=100)
        session.add(balance)
        await session.flush()
    return balance


def outcome(prediction: str, number: int) -> tuple[str, bool, int]:
    color = "green" if number == 0 else ("red" if number % 2 == 0 else "black")
    if prediction == color:
        return color, True, 14 if color == "green" else 2
    if prediction == "even" and number != 0 and number % 2 == 0:
        return color, True, 2
    if prediction == "odd" and number % 2 == 1:
        return color, True, 2
    if prediction == "1-12" and 1 <= number <= 12:
        return color, True, 3
    if prediction == "13-24" and 13 <= number <= 24:
        return color, True, 3
    if prediction == "25-36" and 25 <= number <= 36:
        return color, True, 3
    return color, False, 0


async def create_private_session(guild_id: str, user_id: str) -> str:
    token = secrets.token_urlsafe(32)
    async with Session() as session:
        session.add(RouletteSession(token_hash=session_hash(token), guild_id=guild_id, user_id=user_id, expires_at=datetime.utcnow() + timedelta(minutes=30)))
        await balance_for(session, guild_id, user_id)
        await session.commit()
    return f"{WEB_URL}/roulette/session?token={token}"


class RoulettePanel(discord.ui.View):
    def __init__(self):
        super().__init__(timeout=None)

    @discord.ui.button(label="Open private table", style=discord.ButtonStyle.success, emoji="🎰", custom_id="roulette_open_private")
    async def open_private(self, interaction: discord.Interaction, button: discord.ui.Button):
        url = await create_private_session(str(interaction.guild_id), str(interaction.user.id))
        embed = discord.Embed(title="Your private Fortune Wheel table", description=f"[Open your secure table]({url})\n\nOnly you can use this session. It expires in 30 minutes.", color=0xDCA85D)
        await interaction.response.send_message(embed=embed, ephemeral=True)


@bot.event
async def on_ready():
    await init_db()
    bot.add_view(RoulettePanel())
    await bot.tree.sync()
    print(f"Fortune Wheel online as {bot.user}")


@bot.tree.command(name="roulette-setup", description="Deploy a private browser roulette panel")
@app_commands.checks.has_permissions(administrator=True)
async def roulette_setup(interaction: discord.Interaction, channel: discord.TextChannel):
    async with Session() as session:
        config = await session.scalar(select(RouletteConfig).where(RouletteConfig.guild_id == str(interaction.guild_id)))
        if config:
            config.enabled = True
        else:
            session.add(RouletteConfig(guild_id=str(interaction.guild_id), min_bet=10, max_bet=10000, currency_name="Coins", enabled=True))
        await session.commit()
    embed = discord.Embed(title="FORTUNE WHEEL", description="A private browser table for every player.\n\nYour balance is persistent, and every session is isolated from other players.", color=0xDCA85D)
    embed.add_field(name="How it works", value="Open your private table, choose a prediction, enter a wager, and spin.")
    embed.set_footer(text="Virtual currency only")
    await channel.send(embed=embed, view=RoulettePanel())
    await interaction.response.send_message(embed=discord.Embed(title="Panel deployed", description=f"The private roulette panel is live in {channel.mention}.", color=0x4CC9A7), ephemeral=True)


@bot.tree.command(name="roulette-balance", description="Show your saved roulette balance")
async def roulette_balance(interaction: discord.Interaction):
    async with Session() as session:
        balance = await balance_for(session, str(interaction.guild_id), str(interaction.user.id))
        config = await config_for(session, str(interaction.guild_id))
        await session.commit()
    await interaction.response.send_message(embed=discord.Embed(title="Your balance", description=f"**{balance.balance:,} {config.currency_name}**", color=0xDCA85D), ephemeral=True)


if __name__ == "__main__":
    token = os.getenv("DISCORD_TOKEN")
    if not token:
        raise ValueError("DISCORD_TOKEN not found in environment")
    bot.run(token)
