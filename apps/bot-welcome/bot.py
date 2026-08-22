import os
import asyncio
from datetime import datetime
from dotenv import load_dotenv
import discord
from discord import app_commands
from discord.ext import commands

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import insert, select

import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "packages", "db"))
from shared_models import WelcomeConfig

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


@bot.event
async def on_ready():
    print(f"Threshold is online as {bot.user}")
    await bot.tree.sync()


@bot.tree.command(name="welcome-setup", description="Set up welcome system")
@app_commands.checks.has_permissions(administrator=True)
async def welcome_setup(
    interaction: discord.Interaction,
    category: discord.CategoryChannel,
    message: str = "Welcome to the server! Please read the rules and click below to verify.",
    delete_after: int = 5,
):
    async with AsyncSessionLocal() as session:
        await session.execute(
            insert(WelcomeConfig).values(
                guild_id=str(interaction.guild_id),
                category_id=str(category.id),
                message_text=message,
                delete_after_min=delete_after,
            ).prefix_with("INSERT OR REPLACE")
        )
        await session.commit()

    embed = discord.Embed(
        title="✅ Welcome System Configured",
        description=f"Welcome category: {category.mention}\nMessage will auto-delete after {delete_after} minutes.",
        color=0x06D6A0,
    )
    await interaction.response.send_message(embed=embed, ephemeral=True)


class AgreeView(discord.ui.View):
    def __init__(self, config: dict, member: discord.Member):
        super().__init__(timeout=120)
        self.config = config
        self.member = member

    @discord.ui.button(
        label="✅ I Agree to the Rules",
        style=discord.ButtonStyle.success,
        custom_id="welcome_agree",
    )
    async def agree(self, interaction: discord.Interaction, button: discord.ui.Button):
        if interaction.user.id != self.member.id:
            await interaction.response.send_message(
                "Only the server member who joined can accept the rules.", ephemeral=True
            )
            return

        verified_role = interaction.guild.get_role(int(os.getenv("VERIFIED_ROLE_ID", "0")) or 0)
        if verified_role:
            try:
                await self.member.add_roles(verified_role)
            except discord.Forbidden:
                pass

        await interaction.response.send_message(
            "✅ You now have access to the server! Welcome!", ephemeral=True
        )

        channel = interaction.channel
        if channel:
            await channel.delete(reason=f"Member {self.member.display_name} passed verification")

    async def on_timeout(self):
        channel = self.member._welcome_channel if hasattr(self.member, "_welcome_channel") else None
        if channel:
            await channel.delete(reason="Welcome channel timed out")


@bot.event
async def on_member_join(member: discord.Member):
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(WelcomeConfig).where(WelcomeConfig.guild_id == str(member.guild.id))
        )
        row = result.fetchone()

        if not row:
            return

        config = dict(row._mapping)
        category = member.guild.get_channel(int(config["category_id"]))
        if not category or not isinstance(category, discord.CategoryChannel):
            return

        overwrites = {
            member.guild.default_role: discord.PermissionOverwrite(read_messages=False),
            member: discord.PermissionOverwrite(read_messages=True, send_messages=True),
            member.guild.me: discord.PermissionOverwrite(read_messages=True, send_messages=True),
        }

        channel_name = f"welcome-{member.name.lower().replace(' ', '-')}"
        channel = await member.guild.create_text_channel(
            channel_name,
            category=category,
            overwrites=overwrites,
            topic=f"Welcome channel for {member.display_name}",
        )

        member._welcome_channel = channel

        embed = discord.Embed(
            title=f"Welcome, {member.display_name}!",
            description=config["message_text"],
            color=0x06D6A0,
        )

        if config.get("image_url"):
            embed.set_image(url=config["image_url"])

        embed.set_footer(text="Click the button below to verify you've read the rules")

        view = AgreeView(config, member)
        await channel.send(embed=embed, view=view)

        delete_after = config.get("delete_after_min", 5) * 60
        asyncio.ensure_future(schedule_cleanup(channel, delete_after))


async def schedule_cleanup(channel: discord.TextChannel, delay: int):
    await asyncio.sleep(delay)
    try:
        await channel.delete(reason="Welcome channel auto-deleted")
    except discord.NotFound:
        pass


if __name__ == "__main__":
    token = os.getenv("DISCORD_TOKEN")
    if not token:
        raise ValueError("DISCORD_TOKEN not found in environment")
    bot.run(token)
