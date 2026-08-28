import os
import random
import asyncio
from datetime import datetime
from dotenv import load_dotenv
import discord
from discord import app_commands
from discord.ext import commands

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, insert, update

import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "packages", "db"))
from shared_models import RouletteConfig, Guild, GuildBot, Bot

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///../../bot-bay.db")
connect_args = {"ssl": "require"} if DATABASE_URL.startswith("postgresql") else {}
engine = create_async_engine(DATABASE_URL, echo=False, connect_args=connect_args)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

intents = discord.Intents.default()
intents.message_content = True
intents.guilds = True

bot = commands.Bot(command_prefix="!", intents=intents)

balances: dict[str, int] = {}
roulette_history: dict[str, list] = {}
daily_bonus: dict[str, str] = {}


async def sync_guild_presence():
    """Register roulette bot in guild_bots for all connected servers."""
    async with AsyncSessionLocal() as session:
        bot_row = await session.execute(select(Bot).where(Bot.slug == "roulette"))
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
    print(f"Fortune Wheel is online as {bot.user}")
    await sync_guild_presence()
    await bot.tree.sync()


@bot.event
async def on_guild_join(guild: discord.Guild):
    await sync_guild_presence()


async def get_roulette_config(guild_id: str):
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(RouletteConfig).where(RouletteConfig.guild_id == guild_id)
        )
        config = result.scalar_one_or_none()
        if config:
            return {
                "guild_id": config.guild_id,
                "min_bet": config.min_bet,
                "max_bet": config.max_bet,
                "currency_name": config.currency_name,
                "enabled": config.enabled,
            }
        return {"min_bet": 10, "max_bet": 10000, "currency_name": "Coins", "enabled": True}


@bot.tree.command(name="roulette-setup", description="Deploy the Fortune Wheel roulette panel")
@app_commands.checks.has_permissions(administrator=True)
async def roulette_setup(interaction: discord.Interaction, channel: discord.TextChannel):
    async with AsyncSessionLocal() as session:
        existing = await session.execute(
            select(RouletteConfig).where(RouletteConfig.guild_id == str(interaction.guild_id))
        )
        row = existing.scalar_one_or_none()

        if not row:
            session.add(
                RouletteConfig(
                    guild_id=str(interaction.guild_id),
                    min_bet=10,
                    max_bet=10000,
                    currency_name="Coins",
                    enabled=True,
                )
            )
        else:
            row.enabled = True
        await session.commit()

    embed = discord.Embed(
        title="🎰 Fortune Wheel — Casino & Roulette",
        description=(
            "Welcome to the Fortune Wheel casino table!\n\n"
            "• Claim your **Daily Bonus** to get free tokens.\n"
            "• Choose your bets and specify the bet amount.\n"
            "• Click **Spin** to test your luck!"
        ),
        color=0x9D4EDD,
    )
    if interaction.guild.icon:
        embed.set_thumbnail(url=interaction.guild.icon.url)
    embed.set_footer(text="Fortune Wheel Gaming System")

    await channel.send(embed=embed, view=RoulettePanelView())
    await interaction.response.send_message(
        f"✅ Roulette panel deployed in {channel.mention}", ephemeral=True
    )


class RoulettePanelView(discord.ui.View):
    def __init__(self):
        super().__init__(timeout=None)

    @discord.ui.select(
        placeholder="Select your bet prediction...",
        max_values=1,
        options=[
            discord.SelectOption(label="Red (2x Payout)", value="red", emoji="🔴"),
            discord.SelectOption(label="Black (2x Payout)", value="black", emoji="⚫"),
            discord.SelectOption(label="Green (14x Payout)", value="green", emoji="🟢"),
            discord.SelectOption(label="Even Numbers (2x)", value="even", emoji="🔢"),
            discord.SelectOption(label="Odd Numbers (2x)", value="odd", emoji="🔢"),
            discord.SelectOption(label="1-12 First Dozen (3x)", value="1-12", emoji="🎯"),
            discord.SelectOption(label="13-24 Second Dozen (3x)", value="13-24", emoji="🎯"),
            discord.SelectOption(label="25-36 Third Dozen (3x)", value="25-36", emoji="🎯"),
        ],
        custom_id="roulette_bet_select",
    )
    async def bet_select(self, interaction: discord.Interaction, select: discord.ui.Select):
        user_id = str(interaction.user.id)
        if user_id not in balances:
            balances[user_id] = 100
        await interaction.response.send_message(
            f"Selected bet: **{select.values[0].upper()}**. Current Balance: **{balances[user_id]}**. Click **Set Bet Amount** or **Spin** to play!",
            ephemeral=True,
        )

    @discord.ui.button(
        label="💰 Set Bet Amount",
        style=discord.ButtonStyle.primary,
        custom_id="roulette_set_amounts",
    )
    async def set_amounts(self, interaction: discord.Interaction, button: discord.ui.Button):
        modal = AmountModal(str(interaction.guild_id))
        await interaction.response.send_modal(modal)

    @discord.ui.button(
        label="🎯 Spin Wheel",
        style=discord.ButtonStyle.success,
        custom_id="roulette_spin",
    )
    async def spin(self, interaction: discord.Interaction, button: discord.ui.Button):
        user_id = str(interaction.user.id)
        if user_id not in balances or balances[user_id] <= 0:
            balances[user_id] = 100

        config = await get_roulette_config(str(interaction.guild_id))
        if not config.get("enabled", True):
            await interaction.response.send_message("❌ Roulette is currently disabled in this server.", ephemeral=True)
            return

        bet_amount = min(50, balances[user_id])
        result = random.randint(0, 36)
        color = "green" if result == 0 else ("red" if result % 2 == 0 else "black")
        is_even = "even" if result % 2 == 0 else "odd"

        # Win calculation
        won = random.choice([True, False])
        currency = config.get("currency_name", "Coins")

        if won:
            winnings = bet_amount * 2
            balances[user_id] += bet_amount
            result_text = f"🎉 **YOU WON {winnings} {currency}!**"
            color_theme = 0x10B981
        else:
            balances[user_id] = max(0, balances[user_id] - bet_amount)
            result_text = f"😢 **YOU LOST {bet_amount} {currency}.**"
            color_theme = 0xEF4444

        embed = discord.Embed(
            title="🎰 Fortune Wheel Results",
            description=f"{result_text}\n\n**Ball Landed On:** #{result} ({color.upper()})\n**New Balance:** {balances[user_id]} {currency}",
            color=color_theme,
        )
        embed.set_footer(text="Fortune Wheel Gaming System")
        await interaction.response.send_message(embed=embed, ephemeral=True)

    @discord.ui.button(
        label="🎁 Daily Bonus",
        style=discord.ButtonStyle.secondary,
        custom_id="roulette_bonus",
    )
    async def daily_bonus(self, interaction: discord.Interaction, button: discord.ui.Button):
        user_id = str(interaction.user.id)
        today = datetime.utcnow().strftime("%Y-%m-%d")

        if daily_bonus.get(user_id) == today:
            await interaction.response.send_message(
                "❌ You have already claimed your daily bonus today! Come back tomorrow.", ephemeral=True
            )
            return

        bonus = random.randint(100, 300)
        if user_id not in balances:
            balances[user_id] = 0
        balances[user_id] += bonus
        daily_bonus[user_id] = today

        config = await get_roulette_config(str(interaction.guild_id))
        currency = config.get("currency_name", "Coins")

        await interaction.response.send_message(
            f"🎁 Daily Bonus Claimed: **+{bonus} {currency}**!\nTotal Balance: **{balances[user_id]} {currency}**",
            ephemeral=True,
        )


class AmountModal(discord.ui.Modal, title="Set Bet Amount"):
    def __init__(self, guild_id: str):
        super().__init__()
        self.guild_id = guild_id

    bet_amount = discord.ui.TextInput(
        label="Bet Amount",
        placeholder="Enter amount to bet...",
        style=discord.TextStyle.short,
    )

    async def on_submit(self, interaction: discord.Interaction):
        try:
            amount = int(self.bet_amount.value)
        except ValueError:
            await interaction.response.send_message("Please enter a valid integer amount.", ephemeral=True)
            return

        config = await get_roulette_config(self.guild_id)
        if config:
            if amount < config["min_bet"] or amount > config["max_bet"]:
                await interaction.response.send_message(
                    f"Bet must be between {config['min_bet']} and {config['max_bet']}.",
                    ephemeral=True,
                )
                return

        user_id = str(interaction.user.id)
        balances[user_id] = amount

        await interaction.response.send_message(
            f"✅ Bet amount set to **{amount}**. Click **Spin Wheel** to play!",
            ephemeral=True,
        )


@bot.event
async def setup_hook():
    bot.add_view(RoulettePanelView())


if __name__ == "__main__":
    token = os.getenv("DISCORD_TOKEN")
    if not token:
        raise ValueError("DISCORD_TOKEN not found in environment")
    bot.run(token)
