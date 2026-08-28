import os
import asyncio
from datetime import datetime
from io import StringIO
from dotenv import load_dotenv
import discord
from discord import app_commands
from discord.ext import commands

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, func

import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "packages", "db"))
from shared_models import Base, Ticket, TicketConfig

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
    print(f"Deskline (Ticket) is online as {bot.user}")
    await bot.tree.sync()


class TicketDropdown(discord.ui.Select):
    def __init__(self):
        options = [
            discord.SelectOption(label="Support | دعم فني", description="أعطال ومشاكل تقنية", emoji="🛠️", value="support"),
            discord.SelectOption(label="Report | بلاغ", description="الإبلاغ عن لاعب أو مخالفة", emoji="🚨", value="report"),
            discord.SelectOption(label="Question | استفسار", description="استفسارات عامة وسؤال الإدارة", emoji="❓", value="question"),
        ]
        super().__init__(placeholder="Choose ticket type | اختر نوع التذكرة", min_values=1, max_values=1, options=options, custom_id="ticket_dropdown")

    async def callback(self, interaction: discord.Interaction):
        await create_user_ticket(interaction, self.values[0])


class TicketPanelView(discord.ui.View):
    def __init__(self):
        super().__init__(timeout=None)
        self.add_item(TicketDropdown())

    @discord.ui.button(label="Open Ticket | فتح تذكرة عامة", style=discord.ButtonStyle.primary, emoji="🎫", custom_id="ticket_open_btn")
    async def open_btn(self, interaction: discord.Interaction, button: discord.ui.Button):
        await create_user_ticket(interaction, "general")


async def create_user_ticket(interaction: discord.Interaction, ticket_type: str):
    await interaction.response.defer(ephemeral=True)
    guild_id = str(interaction.guild_id)

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(TicketConfig).where(TicketConfig.guild_id == guild_id)
        )
        config = result.scalar_one_or_none()
        if not config or not config.category_id:
            await interaction.followup.send("❌ نظام التذاكر لم يتم إعداده بعد في هذا السيرفر.", ephemeral=True)
            return

        # Check for open ticket
        result_tickets = await session.execute(
            select(Ticket).where(
                Ticket.guild_id == guild_id,
                Ticket.opened_by == str(interaction.user.id),
                Ticket.status.in_(["open", "claimed"])
            )
        )
        existing = result_tickets.fetchall()
        if existing:
            await interaction.followup.send("❌ لديك تذكرة مفتوحة بالفعل في السيرفر.", ephemeral=True)
            return

        # Count total tickets for ticket number
        count_res = await session.execute(
            select(func.count(Ticket.id)).where(Ticket.guild_id == guild_id)
        )
        ticket_number = count_res.scalar() + 1

    category = interaction.guild.get_channel(int(config.category_id))
    if not category or not isinstance(category, discord.CategoryChannel):
        await interaction.followup.send("❌ فئة التذاكر المحددة غير موجودة.", ephemeral=True)
        return

    overwrites = {
        interaction.guild.default_role: discord.PermissionOverwrite(read_messages=False),
        interaction.user: discord.PermissionOverwrite(read_messages=True, send_messages=True),
        interaction.guild.me: discord.PermissionOverwrite(read_messages=True, send_messages=True, manage_messages=True, manage_channels=True),
    }

    channel = await interaction.guild.create_text_channel(
        name=f"ticket-{ticket_type}-{ticket_number}",
        category=category,
        overwrites=overwrites,
        topic=f"Ticket #{ticket_number} ({ticket_type}) | Opened by {interaction.user}",
    )

    async with AsyncSessionLocal() as session:
        new_ticket = Ticket(
            guild_id=guild_id,
            number=ticket_number,
            channel_id=str(channel.id),
            type=ticket_type,
            opened_by=str(interaction.user.id),
            status="open",
            created_at=datetime.utcnow()
        )
        session.add(new_ticket)
        await session.commit()

    embed = discord.Embed(
        title=f"🎫 Ticket #{ticket_number} | تذكرة جديدة",
        description=f"مرحباً {interaction.user.mention}\nلقد قمت بفتح تذكرة من نوع **({ticket_type})**.\nالرجاء طرح مشكلتك وسيقوم فريق الدعم بالرد عليك قريباً.",
        color=0xF2A93B
    )
    embed.set_footer(text="أزرار التحكم بالتذكرة بالأسفل")

    view = TicketActionView(ticket_number, str(interaction.user.id), guild_id)
    await channel.send(embed=embed, view=view)

    await interaction.followup.send(f"✅ تم فتح تذكرتك بنجاح: {channel.mention}", ephemeral=True)


class TicketActionView(discord.ui.View):
    def __init__(self, ticket_number: int, owner_id: str, guild_id: str):
        super().__init__(timeout=None)
        self.ticket_number = ticket_number
        self.owner_id = owner_id
        self.guild_id = guild_id

    @discord.ui.button(label="Claim | استلام التذكرة", style=discord.ButtonStyle.success, emoji="🙋‍♂️", custom_id="ticket_claim_btn")
    async def claim(self, interaction: discord.Interaction, button: discord.ui.Button):
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(Ticket).where(Ticket.guild_id == self.guild_id, Ticket.number == self.ticket_number)
            )
            ticket = result.scalar_one_or_none()
            if not ticket:
                await interaction.response.send_message("❌ لم يتم العثور على التذكرة.", ephemeral=True)
                return

            ticket.claimed_by = str(interaction.user.id)
            ticket.claimed_at = datetime.utcnow()
            ticket.status = "claimed"
            await session.commit()

        embed = interaction.message.embeds[0]
        # remove previous claimed by field if exists
        for i, field in enumerate(embed.fields):
            if field.name == "🙋‍♂️ Claimed By":
                embed.remove_field(i)
                break

        embed.add_field(name="🙋‍♂️ Claimed By", value=f"<@{interaction.user.id}>", inline=False)
        embed.color = discord.Color.gold()
        await interaction.message.edit(embed=embed)

        await interaction.response.send_message(f"✅ تم استلام التذكرة بواسطة {interaction.user.mention}")

    @discord.ui.button(label="Close | إغلاق التذكرة", style=discord.ButtonStyle.danger, emoji="🔒", custom_id="ticket_close_btn")
    async def close(self, interaction: discord.Interaction, button: discord.ui.Button):
        await interaction.response.send_message("🔒 سيتم إغلاق التذكرة خلال 5 ثوانٍ وسحب الصلاحيات...", ephemeral=True)
        await asyncio.sleep(5)

        channel = interaction.channel
        if channel:
            # Remove send messages for the owner
            owner = interaction.guild.get_member(int(self.owner_id))
            if owner:
                await channel.set_permissions(owner, send_messages=False, read_messages=True)

        transcript = await build_transcript(channel, self.ticket_number, interaction.user)

        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(Ticket).where(Ticket.guild_id == self.guild_id, Ticket.number == self.ticket_number)
            )
            ticket = result.scalar_one_or_none()
            if ticket:
                ticket.status = "closed"
                ticket.closed_by = str(interaction.user.id)
                ticket.closed_at = datetime.utcnow()
                ticket.transcript_content = transcript
                await session.commit()

            result_config = await session.execute(
                select(TicketConfig).where(TicketConfig.guild_id == self.guild_id)
            )
            config = result_config.scalar_one_or_none()

        if config and config.log_channel_id:
            log_channel = interaction.guild.get_channel(int(config.log_channel_id))
            if log_channel:
                file = discord.File(StringIO(transcript), filename=f"ticket-{self.ticket_number}.txt")
                log_embed = discord.Embed(title=f"🔒 Ticket #{self.ticket_number} Closed", color=0x888888)
                log_embed.add_field(name="Ticket Number", value=str(self.ticket_number))
                log_embed.add_field(name="Owner", value=f"<@{self.owner_id}>")
                log_embed.add_field(name="Closed By", value=interaction.user.mention, inline=False)
                await log_channel.send(embed=log_embed, file=file)

        await channel.send("🔒 تم إغلاق التذكرة. سيتم حذف القناة خلال 10 ثوانٍ...")
        await asyncio.sleep(10)
        await channel.delete()


async def build_transcript(channel: discord.TextChannel, ticket_number: int, closer: discord.User) -> str:
    lines = []
    lines.append(f"=== Ticket #{ticket_number} Transcript ===")
    lines.append(f"Closed by: {closer.display_name} ({closer.id})")
    lines.append(f"Closed at: {datetime.utcnow().isoformat()}")
    lines.append(f"--- Conversation Log ---")
    lines.append("")

    async for msg in channel.history(limit=None, oldest_first=True):
        author = msg.author.display_name if msg.author else "Unknown"
        timestamp = msg.created_at.strftime("%Y-%m-%d %H:%M:%S")
        content = msg.content if msg.content else (f"[{msg.attachments[0].filename if msg.attachments else 'embed'}]")
        lines.append(f"[{timestamp}] {author}: {content}")
        lines.append("")

    lines.append("=== End of Transcript ===")
    return "\n".join(lines)


@bot.tree.command(name="ticket-setup", description="Set up the ticket panel in a channel")
@app_commands.checks.has_permissions(administrator=True)
async def ticket_setup(
    interaction: discord.Interaction,
    channel: discord.TextChannel,
    category: discord.CategoryChannel,
    log_channel: discord.TextChannel,
):
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(TicketConfig).where(TicketConfig.guild_id == str(interaction.guild_id))
        )
        config = result.scalar_one_or_none()
        if not config:
            config = TicketConfig(
                guild_id=str(interaction.guild_id),
                channel_id=str(channel.id),
                category_id=str(category.id),
                log_channel_id=str(log_channel.id)
            )
            session.add(config)
        else:
            config.channel_id = str(channel.id)
            config.category_id = str(category.id)
            config.log_channel_id = str(log_channel.id)
        
        await session.commit()

        embed = discord.Embed(
            title="🎫 Open a Ticket | فتح تذكرة",
            description="يرجى اختيار نوع التذكرة من القائمة بالأسفل للتحدث مع الإدارة أو الدعم الفني.",
            color=0xF2A93B
        )
        if interaction.guild.icon:
            embed.set_thumbnail(url=interaction.guild.icon.url)
        embed.set_footer(text="Deskline Ticket System")

        view = TicketPanelView()
        msg = await channel.send(embed=embed, view=view)
        config.panel_message_id = str(msg.id)
        await session.commit()

    embed_res = discord.Embed(
        title="✅ تم إعداد نظام التذاكر",
        description=f"تم إرسال اللوحة في {channel.mention}\nالتذاكر ستفتح تحت تصنيف: **{category.name}**",
        color=0x3CFF4A
    )
    await interaction.response.send_message(embed=embed_res, ephemeral=True)


@bot.tree.command(name="ticket-stats", description="Show ticket statistics")
@app_commands.checks.has_permissions(administrator=True)
async def ticket_stats(interaction: discord.Interaction):
    guild_id = str(interaction.guild_id)

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(Ticket).where(Ticket.guild_id == guild_id)
        )
        tickets = result.scalars().all()

    open_count = len([t for t in tickets if t.status == "open"])
    claimed_count = len([t for t in tickets if t.status == "claimed"])
    closed_count = len([t for t in tickets if t.status == "closed"])

    embed = discord.Embed(
        title="🎫 Ticket Statistics | إحصائيات التذاكر",
        color=0xF2A93B
    )
    embed.add_field(name="Open", value=str(open_count), inline=True)
    embed.add_field(name="Claimed", value=str(claimed_count), inline=True)
    embed.add_field(name="Closed", value=str(closed_count), inline=True)
    embed.add_field(name="Total", value=str(len(tickets)), inline=False)

    await interaction.response.send_message(embed=embed, ephemeral=True)


@bot.event
async def setup_hook():
    bot.add_view(TicketPanelView())


if __name__ == "__main__":
    token = os.getenv("DISCORD_TOKEN")
    if not token:
        raise ValueError("DISCORD_TOKEN not found in environment")
    bot.run(token)
