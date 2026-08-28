import os
import sys
import asyncio
import random as random_module
from datetime import datetime, timedelta
from dotenv import load_dotenv
import discord
from discord import app_commands
from discord.ext import commands, tasks

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, update

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "packages", "db"))
from shared_models import Giveaway

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///../../bot-bay.db")
connect_args = {"ssl": "require"} if DATABASE_URL.startswith("postgresql") else {}
engine = create_async_engine(DATABASE_URL, echo=False, connect_args=connect_args)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

intents = discord.Intents.default()
intents.message_content = True
intents.guilds = True

bot = commands.Bot(command_prefix="!", intents=intents)


@bot.event
async def on_ready():
    print(f"Bounty Drop (Giveaway) is online as {bot.user}")
    await bot.tree.sync()
    if not check_giveaways.is_running():
        check_giveaways.start()


def parse_duration(duration: str) -> int:
    total = 0
    parts = duration.split()
    for part in parts:
        if part.endswith("d"):
            total += int(part[:-1]) * 86400
        elif part.endswith("h"):
            total += int(part[:-1]) * 3600
        elif part.endswith("m"):
            total += int(part[:-1]) * 60
        elif part.endswith("s"):
            total += int(part[:-1])
    return total


def create_giveaway_embed(prize: str, winners: int, ends_at: datetime) -> discord.Embed:
    embed = discord.Embed(
        title="🎁 GIVEAWAY | مسابقة جديدة",
        description=f"**الهدية:** {prize}\n**عدد الفائزين:** {winners}\n**ينتهي:** <t:{int(ends_at.timestamp())}:R>",
        color=0xFFA500,
    )
    embed.set_footer(text="عدد المشاركين الحالي: 0 | اضغط على الزر للدخول/الخروج")
    return embed


class GiveawayView(discord.ui.View):
    def __init__(self):
        super().__init__(timeout=None)

    @discord.ui.button(
        label="Join Giveaway | دخول",
        style=discord.ButtonStyle.success,
        emoji="🎉",
        custom_id="giveaway_join",
    )
    async def join(self, interaction: discord.Interaction, button: discord.ui.Button):
        message_id = str(interaction.message.id)
        user_id = str(interaction.user.id)
        
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(Giveaway).where(Giveaway.message_id == message_id)
            )
            giveaway = result.scalar_one_or_none()
            if not giveaway:
                await interaction.response.send_message("❌ لم يتم العثور على هذه المسابقة في قاعدة البيانات.", ephemeral=True)
                return
            
            if giveaway.status != "active":
                await interaction.response.send_message("❌ هذه المسابقة انتهت بالفعل.", ephemeral=True)
                return
            
            participants_list = giveaway.participants.split(",") if giveaway.participants else []
            # filter empty values
            participants_list = [p for p in participants_list if p.strip()]

            if user_id in participants_list:
                participants_list.remove(user_id)
                giveaway.participants = ",".join(participants_list)
                await session.commit()
                await interaction.response.send_message("❌ لقد خرجت من المسابقة.", ephemeral=True)
            else:
                participants_list.append(user_id)
                giveaway.participants = ",".join(participants_list)
                await session.commit()
                await interaction.response.send_message("✅ لقد دخلت المسابقة بنجاح!", ephemeral=True)
                
            count = len(participants_list)
            embed = interaction.message.embeds[0]
            embed.set_footer(text=f"عدد المشاركين الحالي: {count} | اضغط على الزر للدخول/الخروج")
            
            view = GiveawayView()
            view.children[0].label = f"Join Giveaway | دخول ({count})"
            await interaction.message.edit(embed=embed, view=view)


@bot.tree.command(name="giveaway_create", description="Create a new giveaway")
@app_commands.describe(prize="What prize to give away", winners="Number of winners", duration="Duration (e.g., 1d 12h 30m 15s)")
@app_commands.checks.has_permissions(administrator=True)
async def giveaway_create(
    interaction: discord.Interaction,
    prize: str,
    winners: int = 1,
    duration: str = "24h",
):
    duration_seconds = parse_duration(duration)
    if duration_seconds <= 0:
        await interaction.response.send_message("Invalid duration format.", ephemeral=True)
        return

    ends_at = datetime.utcnow() + timedelta(seconds=duration_seconds)

    # Defer response first since we are sending embed and modifying
    await interaction.response.defer(ephemeral=True)

    async with AsyncSessionLocal() as session:
        new_g = Giveaway(
            guild_id=str(interaction.guild_id),
            channel_id=str(interaction.channel_id),
            prize=prize,
            winners_count=winners,
            ends_at=ends_at,
            status="active",
            created_by=str(interaction.user.id),
            participants=""
        )
        session.add(new_g)
        await session.commit()
        giveaway_id = new_g.id

        embed = create_giveaway_embed(prize, winners, ends_at)
        view = GiveawayView()
        msg = await interaction.channel.send(embed=embed, view=view)
        
        new_g.message_id = str(msg.id)
        await session.commit()

    await interaction.followup.send(f"✅ تم بدء المسابقة بنجاح في هذه القناة!", ephemeral=True)


@bot.tree.command(name="giveaway_end", description="End a giveaway early")
@app_commands.checks.has_permissions(administrator=True)
async def giveaway_end(interaction: discord.Interaction, message_id: str):
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(Giveaway).where(
                Giveaway.channel_id == str(interaction.channel_id),
                Giveaway.message_id == message_id,
            )
        )
        giveaway = result.scalar_one_or_none()

        if not giveaway:
            await interaction.response.send_message("Giveaway not found.", ephemeral=True)
            return

        giveaway.status = "ended"
        await session.commit()
        giveaway_id = giveaway.id

    await interaction.response.send_message(f"Giveaway ended. Drawing winners...", ephemeral=True)
    await draw_winners(giveaway_id)


async def draw_winners(giveaway_id):
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(Giveaway).where(Giveaway.id == str(giveaway_id))
        )
        giveaway = result.scalar_one_or_none()

        if not giveaway or not giveaway.message_id:
            return

        channel = bot.get_channel(int(giveaway.channel_id))
        if not channel:
            return

        try:
            message = await channel.fetch_message(int(giveaway.message_id))
        except discord.NotFound:
            giveaway.status = "cancelled"
            await session.commit()
            return

        participants_list = giveaway.participants.split(",") if giveaway.participants else []
        pool = [p for p in participants_list if p.strip()]
        
        winners_ids = []
        if pool:
            winners_ids = random_module.sample(pool, min(giveaway.winners_count, len(pool)))

        winners_mentions = [f"<@{uid}>" for uid in winners_ids]
        
        embed = discord.Embed(
            title="🎉 GIVEAWAY ENDED | انتهت المسابقة",
            description=f"**الهدية:** {giveaway.prize}\n**الفائزين:** {', '.join(winners_mentions) or 'لا يوجد مشاركين صالحين'}",
            color=0xFFA500,
        )
        await message.edit(embed=embed, view=None)

        for uid in winners_ids:
            try:
                user = await bot.fetch_user(int(uid))
                if user:
                    await user.send(f"🎉 مبارك! لقد فزت بـ: {giveaway.prize} في سيرفر {message.guild.name}!")
            except Exception:
                pass

        giveaway.status = "completed"
        await session.commit()


@tasks.loop(seconds=10)
async def check_giveaways():
    async with AsyncSessionLocal() as session:
        now = datetime.utcnow()
        result = await session.execute(
            select(Giveaway).where(
                Giveaway.status == "active",
                Giveaway.ends_at <= now,
            )
        )
        ended = result.scalars().all()

        for g in ended:
            g.status = "ended"
            await session.commit()
            await draw_winners(g.id)


@bot.event
async def setup_hook():
    bot.add_view(GiveawayView())


if __name__ == "__main__":
    token = os.getenv("DISCORD_TOKEN")
    if not token:
        raise ValueError("DISCORD_TOKEN not found in environment")
    bot.run(token)
