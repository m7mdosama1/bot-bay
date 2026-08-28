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
from shared_models import Base, Ticket, TicketConfig, Guild, GuildBot, Bot

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
    """Register ticket bot in guild_bots for all connected servers."""
    async with AsyncSessionLocal() as session:
        bot_row = await session.execute(select(Bot).where(Bot.slug == "ticket"))
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
    print(f"Deskline (Ticket) is online as {bot.user}")
    await sync_guild_presence()
    await bot.tree.sync()


@bot.event
async def on_guild_join(guild: discord.Guild):
    await sync_guild_presence()


class TicketDropdown(discord.ui.Select):
    def __init__(self):
        options = [
            discord.SelectOption(label="Technical Support", description="Get assistance with technical issues", emoji="🛠️", value="support"),
            discord.SelectOption(label="General Inquiry", description="Questions regarding rules or server", emoji="❓", value="inquiry"),
            discord.SelectOption(label="Management & Reports", description="Report a player or contact admins", emoji="🚨", value="report"),
        ]
        super().__init__(placeholder="Select ticket category...", min_values=1, max_values=1, options=options, custom_id="ticket_dropdown")

    async def callback(self, interaction: discord.Interaction):
        await create_user_ticket(interaction, self.values[0])


class TicketPanelView(discord.ui.View):
    def __init__(self):
        super().__init__(timeout=None)
        self.add_item(TicketDropdown())

    @discord.ui.button(label="Open Ticket", style=discord.ButtonStyle.primary, emoji="🎫", custom_id="ticket_open_btn")
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
            await interaction.followup.send("❌ Ticket category is not configured for this server yet.", ephemeral=True)
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
            await interaction.followup.send("❌ You already have an open ticket in this server.", ephemeral=True)
            return

        # Count total tickets for ticket number
        count_res = await session.execute(
            select(func.count(Ticket.id)).where(Ticket.guild_id == guild_id)
        )
        ticket_number = count_res.scalar() + 1

    category = interaction.guild.get_channel(int(config.category_id))
    if not category or not isinstance(category, discord.CategoryChannel):
        await interaction.followup.send("❌ Configured ticket category was not found.", ephemeral=True)
        return

    overwrites = {
        interaction.guild.default_role: discord.PermissionOverwrite(read_messages=False),
        interaction.user: discord.PermissionOverwrite(read_messages=True, send_messages=True, attach_files=True, embed_links=True),
        interaction.guild.me: discord.PermissionOverwrite(read_messages=True, send_messages=True, manage_messages=True, manage_channels=True),
    }

    channel = await interaction.guild.create_text_channel(
        name=f"ticket-{ticket_number}",
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
        title=f"🎫 Ticket #{ticket_number}",
        description=(
            f"Hello {interaction.user.mention}!\n"
            f"Thank you for contacting support regarding **{ticket_type.upper()}**.\n\n"
            f"Please describe your issue in detail. A staff member will assist you shortly."
        ),
        color=0xF2A93B
    )
    embed.set_footer(text="Deskline Ticket System • Click below to manage this ticket")

    view = TicketActionView(ticket_number, str(interaction.user.id), guild_id)
    await channel.send(content=f"{interaction.user.mention}", embed=embed, view=view)

    await interaction.followup.send(f"✅ Ticket created successfully: {channel.mention}", ephemeral=True)


class TicketActionView(discord.ui.View):
    def __init__(self, ticket_number: int, owner_id: str, guild_id: str):
        super().__init__(timeout=None)
        self.ticket_number = ticket_number
        self.owner_id = owner_id
        self.guild_id = guild_id

    @discord.ui.button(label="Claim Ticket", style=discord.ButtonStyle.success, emoji="🙋", custom_id="ticket_claim_btn")
    async def claim(self, interaction: discord.Interaction, button: discord.ui.Button):
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(Ticket).where(Ticket.guild_id == self.guild_id, Ticket.number == self.ticket_number)
            )
            ticket = result.scalar_one_or_none()
            if not ticket:
                await interaction.response.send_message("❌ Ticket record not found.", ephemeral=True)
                return

            ticket.claimed_by = str(interaction.user.id)
            ticket.claimed_at = datetime.utcnow()
            ticket.status = "claimed"
            await session.commit()

        embed = interaction.message.embeds[0]
        for i, field in enumerate(embed.fields):
            if field.name == "Claimed By":
                embed.remove_field(i)
                break

        embed.add_field(name="Claimed By", value=f"<@{interaction.user.id}>", inline=False)
        embed.color = discord.Color.gold()
        await interaction.message.edit(embed=embed)

        await interaction.response.send_message(f"✅ Ticket claimed by {interaction.user.mention}")

    @discord.ui.button(label="Close Ticket", style=discord.ButtonStyle.danger, emoji="🔒", custom_id="ticket_close_btn")
    async def close(self, interaction: discord.Interaction, button: discord.ui.Button):
        await interaction.response.send_message("🔒 Closing ticket and saving transcript...", ephemeral=True)
        await asyncio.sleep(3)

        channel = interaction.channel
        if channel:
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
                log_embed.add_field(name="Opened By", value=f"<@{self.owner_id}>")
                log_embed.add_field(name="Closed By", value=interaction.user.mention, inline=False)
                await log_channel.send(embed=log_embed, file=file)

        await channel.send("🔒 Ticket closed. Deleting channel in 5 seconds...")
        await asyncio.sleep(5)
        await channel.delete()


async def build_transcript(channel: discord.TextChannel, ticket_number: int, closer: discord.User) -> str:
    lines = []
    lines.append(f"=== Ticket #{ticket_number} Transcript ===")
    lines.append(f"Closed by: {closer.display_name} ({closer.id})")
    lines.append(f"Closed at: {datetime.utcnow().isoformat()}")
    lines.append("--- Conversation Log ---")
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
            title="🎫 Support Tickets",
            description="Select a category from the dropdown menu below to open a private support ticket.",
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
        title="✅ Ticket System Configured",
        description=f"Panel deployed in {channel.mention}\nTickets Category: **{category.name}**",
        color=0x3CFF4A
    )
    await interaction.response.send_message(embed=embed_res, ephemeral=True)


@bot.event
async def setup_hook():
    bot.add_view(TicketPanelView())


if __name__ == "__main__":
    token = os.getenv("DISCORD_TOKEN")
    if not token:
        raise ValueError("DISCORD_TOKEN not found in environment")
    bot.run(token)
