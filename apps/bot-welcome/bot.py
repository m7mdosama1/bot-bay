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
    print(f"Threshold (Welcome) is online as {bot.user}")
    await bot.tree.sync()


class WelcomeView(discord.ui.View):
    def __init__(self):
        super().__init__(timeout=None)

    @discord.ui.button(
        label="Accept Rules | الموافقة على القوانين",
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
                await interaction.response.send_message("❌ لم يتم إعداد رول التحقق لهذا السيرفر بعد.", ephemeral=True)
                return
            
            role = interaction.guild.get_role(int(config.role_id))
            if not role:
                await interaction.response.send_message("❌ الرول المحدد غير موجود في السيرفر.", ephemeral=True)
                return
            
            try:
                await member.add_roles(role)
                await interaction.response.send_message("✅ تم قبول القوانين بنجاح! مرحباً بك في السيرفر.", ephemeral=True)
            except discord.Forbidden:
                await interaction.response.send_message("❌ لا أملك الصلاحيات الكافية لإعطائك الرول.", ephemeral=True)


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
        
        # Build welcome embed
        embed_color = int(config.embed_color.lstrip('#'), 16) if config.embed_color else 0x3CFF4A
        embed = discord.Embed(
            title=f"🎉 مرحباً بك في السيرفر!",
            description=config.message_text.replace("{member}", member.mention).replace("{user}", member.mention) if config.message_text else f"مرحباً بك {member.mention} في سيرفرنا!",
            color=embed_color
        )
        if config.show_avatar:
            embed.set_thumbnail(url=member.display_avatar.url)
        
        # Banner image
        if config.show_banner and member.guild.banner:
            embed.set_image(url=member.guild.banner.url)
        elif config.image_url:
            embed.set_image(url=config.image_url)
            
        embed.add_field(name="العضو رقم:", value=str(member.guild.member_count), inline=True)
        embed.set_footer(text="اضغط على الزر أدناه للموافقة على القوانين ودخول السيرفر")
        
        view = WelcomeView()
        await channel.send(content=member.mention, embed=embed, view=view)


@bot.tree.command(name="welcome-setup", description="Set up welcome channel and auto-role")
@app_commands.checks.has_permissions(administrator=True)
async def welcome_setup(
    interaction: discord.Interaction,
    channel: discord.TextChannel,
    role: discord.Role,
    message: str = "مرحباً {member} في السيرفر! الرجاء قراءة القوانين والضغط على الزر بالأسفل للتحقق.",
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
        title="✅ تم إعداد نظام الترحيب",
        description=f"قناة الترحيب: {channel.mention}\nالرول المعطى: {role.mention}",
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

