import os
import random
import asyncio
from datetime import datetime
from io import StringIO
from dotenv import load_dotenv
import discord
from discord import app_commands
from discord.ext import commands, tasks

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, insert, update, func

import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "packages", "db"))
from shared_models import RouletteConfig

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///../../bot-bay.db")
engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

intents = discord.Intents.default()
intents.message_content = True
intents.guilds = True

bot = commands.Bot(command_prefix="!", intents=intents)

# In-memory balance store (could be extended to database)
balances: dict[str, int] = {}
roulette_history: dict[str, list] = {}
daily_bonus: dict[str, str] = {}  # user_id -> last_claim_date


@bot.event
async def on_ready():
    print(f"Fortune Wheel is online as {bot.user}")
    await bot.tree.sync()
    await load_configs()


async def load_configs():
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(RouletteConfig))
        configs = result.fetchall()
        print(f"Loaded {len(configs)} roulette configurations")


async def get_roulette_config(guild_id: str):
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(RouletteConfig).where(RouletteConfig.guild_id == guild_id)
        )
        row = result.fetchone()
        return dict(row._mapping) if row else None


@bot.tree.command(name="roulette-setup", description="Set up the roulette panel")
@app_commands.checks.has_permissions(administrator=True)
async def roulette_setup(interaction: discord.Interaction, channel: discord.TextChannel):
    async with AsyncSessionLocal() as session:
        existing = await session.execute(
            select(RouletteConfig).where(RouletteConfig.guild_id == str(interaction.guild_id))
        )
        row = existing.fetchone()

        if row:
            await session.execute(
                update(RouletteConfig)
                .where(RouletteConfig.guild_id == str(interaction.guild_id))
                .values(enabled=True)
            )
        else:
            await session.execute(
                insert(RouletteConfig).values(
                    guild_id=str(interaction.guild_id),
                    min_bet=10,
                    max_bet=1000,
                    currency_name="عملة",
                    enabled=True,
                )
            )
        await session.commit()

    embed = discord.Embed(
        title="🎰 Fortune Wheel",
        description="Roulette betting system configured!",
        color=0x9D4EDD,
    )
    await channel.send(embed=embed, view=RoulettePanelView(str(interaction.guild_id)))
    await interaction.response.send_message(
        f"✅ Roulette panel set up in {channel.mention}", ephemeral=True
    )


class RoulettePanelView(discord.ui.View):
    def __init__(self, guild_id: str):
        super().__init__(timeout=None)
        self.guild_id = guild_id

    @discord.ui.select(
        placeholder="Select your bets...",
        max_values=10,
        options=[
            discord.SelectOption(label="Red", value="red", emoji="🔴"),
            discord.SelectOption(label="Black", value="black", emoji="⚫"),
            discord.SelectOption(label="Green", value="green", emoji="🟢"),
            discord.SelectOption(label="Even", value="even", emoji="🔢"),
            discord.SelectOption(label="Odd", value="odd", emoji="🔢"),
            discord.SelectOption(label="1-12", value="1-12", emoji="🎯"),
            discord.SelectOption(label="13-24", value="13-24", emoji="🎯"),
            discord.SelectOption(label="25-36", value="25-36", emoji="🎯"),
        ],
        custom_id="roulette_bet_select",
    )
    async def bet_select(self, interaction: discord.Interaction, select: discord.ui.Select):
        await interaction.response.send_message(
            f"Selected bets: {', '.join(select.values)}. Click 'Set Amounts' to specify how much to bet.",
            ephemeral=True,
        )

    @discord.ui.button(
        label="💰 Set Amounts",
        style=discord.ButtonStyle.primary,
        custom_id="roulette_set_amounts",
    )
    async def set_amounts(self, interaction: discord.Interaction, button: discord.ui.Button):
        modal = AmountModal(self.guild_id)
        await interaction.response.send_modal(modal)

    @discord.ui.button(
        label="🎯 Spin",
        style=discord.ButtonStyle.success,
        custom_id="roulette_spin",
    )
    async def spin(self, interaction: discord.Interaction, button: discord.ui.Button):
        user_id = str(interaction.user.id)
        if user_id not in balances or balances[user_id] <= 0:
            await interaction.response.send_message(
                "You don't have any balance to bet! Use `/roulette daily-bonus` or wait for the daily reset.",
                ephemeral=True,
            )
            return

        result = random.randint(0, 36)
        color = "green" if result == 0 else ("red" if result % 2 == 0 else "black")
        is_even = "even" if result % 2 == 0 else "odd"
        range_ = "1-12" if result <= 12 else ("13-24" if result <= 24 else "25-36")

        winnings = 0
        config = await get_roulette_config(self.guild_id)
        bet_amount = balances[user_id] if config else 10

        # Simplified: player bets all their balance on a random selection
        winnings = bet_amount * 2
        balances[user_id] = winnings

        if user_id not in roulette_history:
            roulette_history[user_id] = []
        roulette_history[user_id].append({
            "timestamp": datetime.utcnow().isoformat(),
            "result": result,
            "color": color,
            "winnings": winnings,
        })

        embed = discord.Embed(
            title="🎰 Fortune Wheel Results",
            color=0x9D4EDD,
        )
        embed.add_field(name="Result", value=f"Number: {result}\nColor: {color}\nParity: {is_even}\nRange: {range_}")
        embed.add_field(name="Winnings", value=f"{winnings} {config['currency_name'] if config else 'عملة'}", inline=False)
        embed.add_field(name="New Balance", value=f"{balances[user_id]}", inline=False)

        await interaction.response.send_message(embed=embed, ephemeral=True)

    @discord.ui.button(
        label="📊 My History",
        style=discord.ButtonStyle.secondary,
        custom_id="roulette_history",
    )
    async def history(self, interaction: discord.Interaction, button: discord.ui.Button):
        user_id = str(interaction.user.id)
        history = roulette_history.get(user_id, [])

        embed = discord.Embed(
            title="📊 Your Roulette History",
            color=0x9D4EDD,
        )
        if not history:
            embed.description = "No history yet. Spin the wheel to get started!"
        else:
            for h in history[-5:]:
                embed.add_field(
                    name=f"{h['timestamp']} - #{h['result']} ({h['color']})",
                    value=f"Winnings: {h['winnings']}",
                    inline=False,
                )

        await interaction.response.send_message(embed=embed, ephemeral=True)

    @discord.ui.button(
        label="🎁 Daily Bonus",
        style=discord.ButtonStyle.primary,
        custom_id="roulette_bonus",
    )
    async def daily_bonus(self, interaction: discord.Interaction, button: discord.ui.Button):
        user_id = str(interaction.user.id)
        today = datetime.utcnow().strftime("%Y-%m-%d")

        if daily_bonus.get(user_id) == today:
            await interaction.response.send_message(
                "You already claimed your daily bonus today!", ephemeral=True
            )
            return

        bonus = random.randint(50, 200)
        if user_id not in balances:
            balances[user_id] = 0
        balances[user_id] += bonus
        daily_bonus[user_id] = today

        await interaction.response.send_message(
            f"🎁 Daily bonus: +{bonus} coins! New balance: {balances[user_id]}",
            ephemeral=True,
        )


class AmountModal(discord.ui.Modal, title="Set Bet Amounts"):
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
            await interaction.response.send_message("Please enter a valid number.", ephemeral=True)
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
            f"✅ Bet amount set to {amount}. Use 'Spin' to play!",
            ephemeral=True,
        )


if __name__ == "__main__":
    token = os.getenv("DISCORD_TOKEN")
    if not token:
        raise ValueError("DISCORD_TOKEN not found in environment")
    bot.run(token)
