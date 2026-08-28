import os
import sys
import asyncio
from dotenv import load_dotenv
import discord
from discord import app_commands
from discord.ext import commands

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "packages", "db"))
from shared_models import WelcomeConfig, Guild, GuildBot, Bot

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
    """Register welcome bot in guild_bots for all connected servers."""
    async with AsyncSessionLocal() as session:
        bot_row = await session.execute(select(Bot).where(Bot.slug == "welcome"))
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
    print(f"Threshold (Welcome) is online as {bot.user}")
    await sync_guild_presence()
    await bot.tree.sync()


@bot.event
async def on_guild_join(guild: discord.Guild):
    await sync_guild_presence()


class WelcomeView(discord.ui.View):
    def __init__(self):
        super().__init__(timeout=None)

    @discord.ui.button(
        label="Accept Rules",
        style=discord.ButtonStyle.success,
        emoji="📜",
        custom_id="welcome_accept_rules",
    )
    async def accept_rules(self, interaction: discord.Interaction, button: discord.ui.Button):
        member = interaction.user
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(WelcomeConfig).where(WelcomeConfig.guild_id == str(interaction.guild_id))
            )
            config = result.scalar_one_or_none()
            if not config or not config.role_id:
                await interaction.response.send_message("❌ Verified role is not configured for this server yet.", ephemeral=True)
                return

            role = interaction.guild.get_role(int(config.role_id))
            if not role:
                await interaction.response.send_message("❌ Configured verified role no longer exists.", ephemeral=True)
                return

            try:
                await member.add_roles(role)
                await interaction.response.send_message("✅ You have accepted the rules! Welcome to the server.", ephemeral=True)
            except discord.Forbidden:
                await interaction.response.send_message("❌ I do not have permission to assign this role. Please check role hierarchy.", ephemeral=True)


@bot.event
async def on_member_join(member: discord.Member):
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(WelcomeConfig).where(WelcomeConfig.guild_id == str(member.guild.id))
        )
        config = result.scalar_one_or_none()
        if not config or not config.channel_id:
            return

        channel = member.guild.get_channel(int(config.channel_id))
        if not channel:
            return

        # Dynamically build welcome embed from latest DB settings
        embed_color = 0x3CFF4A
        if config.embed_color:
            try:
                embed_color = int(config.embed_color.lstrip('#'), 16)
            except Exception:
                embed_color = 0x3CFF4A

        msg_text = config.message_text or f"Welcome to the server, {member.mention}! Please read the rules and click below."
        msg_text = msg_text.replace("{member}", member.mention).replace("{user}", member.mention).replace("{{user}}", member.mention).replace("{{server}}", member.guild.name)

        embed = discord.Embed(
            title=f"Welcome to {member.guild.name}! 🎉",
            description=msg_text,
            color=embed_color
        )
        if config.show_avatar:
            embed.set_thumbnail(url=member.display_avatar.url)

        if config.show_banner and member.guild.banner:
            embed.set_image(url=member.guild.banner.url)
        elif config.image_url:
            embed.set_image(url=config.image_url)

        embed.add_field(name="Member Count", value=f"#{member.guild.member_count}", inline=True)
        embed.set_footer(text="Click the button below to accept the server rules")

        view = WelcomeView()
        await channel.send(content=member.mention, embed=embed, view=view)


@bot.tree.command(name="welcome-setup", description="Configure welcome channel and verified role")
@app_commands.checks.has_permissions(administrator=True)
async def welcome_setup(
    interaction: discord.Interaction,
    channel: discord.TextChannel,
    role: discord.Role,
    message: str = "Welcome {member} to our server! Please read the rules and click the button below to get verified.",
):
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(WelcomeConfig).where(WelcomeConfig.guild_id == str(interaction.guild_id))
        )
        config = result.scalar_one_or_none()
        if not config:
            config = WelcomeConfig(
                guild_id=str(interaction.guild_id),
                channel_id=str(channel.id),
                role_id=str(role.id),
                message_text=message,
                embed_color="#3CFF4A",
                show_avatar=True,
                show_banner=True
            )
            session.add(config)
        else:
            config.channel_id = str(channel.id)
            config.role_id = str(role.id)
            config.message_text = message

        await session.commit()

    embed = discord.Embed(
        title="✅ Welcome System Configured",
        description=f"Welcome Channel: {channel.mention}\nVerified Role: {role.mention}",
        color=0x3CFF4A
    )
    await interaction.response.send_message(embed=embed, ephemeral=True)


@bot.event
async def setup_hook():
    bot.add_view(WelcomeView())


if __name__ == "__main__":
    token = os.getenv("DISCORD_TOKEN")
    if not token:
        raise ValueError("DISCORD_TOKEN not found in environment")
    bot.run(token)
