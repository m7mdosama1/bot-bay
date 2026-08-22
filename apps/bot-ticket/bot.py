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

import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "packages", "db"))
from shared_models import Base, Ticket

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///../../bot-bay.db")
engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

intents = discord.Intents.default()
intents.message_content = True
intents.guilds = True
intents.members = True

bot = commands.Bot(command_prefix="!", intents=intents)

# In-memory config store: guild_id -> {category_id, log_channel_id, panel_message_id}
ticket_configs: dict[str, dict] = {}


@bot.event
async def on_ready():
    print(f"Deskline is online as {bot.user}")
    await load_configs()
    await bot.tree.sync()


async def load_configs():
    """Load ticket panel configurations from database on startup"""
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            Ticket.__table__.select().distinct()
        )
        # Load existing config from a config table if needed
        # For now, configs are stored in-memory
    print("Ticket configs loaded")


@bot.tree.command(name="ticket-setup", description="Set up the ticket panel")
@app_commands.checks.has_permissions(administrator=True)
async def ticket_setup(
    interaction: discord.Interaction,
    channel: discord.TextChannel,
    category: discord.CategoryChannel,
    log_channel: discord.TextChannel,
):
    ticket_configs[str(interaction.guild_id)] = {
        "category_id": str(category.id),
        "log_channel_id": str(log_channel.id),
    }

    embed = discord.Embed(
        title="🎫 Ticket System",
        description="Need help? Open a ticket and our support team will assist you!",
        color=0xF2A93B,
    )
    embed.set_footer(text="Bot Bay - Deskline")

    view = TicketPanelView()
    msg = await channel.send(embed=embed, view=view)
    
    ticket_configs[str(interaction.guild_id)]["panel_message_id"] = str(msg.id)

    await interaction.response.send_message(
        f"✅ Ticket panel set up in {channel.mention}", ephemeral=True
    )


class TicketPanelView(discord.ui.View):
    def __init__(self):
        super().__init__(timeout=None)

    @discord.ui.button(
        label="Open Ticket",
        style=discord.ButtonStyle.primary,
        emoji="🎫",
        custom_id="ticket_open_button",
    )
    async def open_ticket(self, interaction: discord.Interaction, button: discord.ui.Button):
        guild_id = str(interaction.guild_id)
        
        if guild_id not in ticket_configs:
            await interaction.response.send_message(
                "❌ Ticket system is not configured. Please ask an admin to run `/ticket-setup`.",
                ephemeral=True,
            )
            return

        config = ticket_configs[guild_id]

        async with AsyncSessionLocal() as session:
            result = await session.execute(
                Ticket.__table__.select().where(Ticket.c.guild_id == guild_id)
            )
            existing = result.fetchall()
            ticket_number = len(existing) + 1

            for t in existing:
                if t.channel_id and t.status in ("open", "claimed"):
                    channel = interaction.guild.get_channel(int(t.channel_id))
                    if channel:
                        await interaction.response.send_message(
                            f"❌ You already have an open ticket: {channel.mention}",
                            ephemeral=True,
                        )
                        return

        category = interaction.guild.get_channel(int(config["category_id"]))
        if not category or not isinstance(category, discord.CategoryChannel):
            await interaction.response.send_message("❌ Ticket category not found.", ephemeral=True)
            return

        overwrites = {
            interaction.guild.default_role: discord.PermissionOverwrite(read_messages=False),
            interaction.user: discord.PermissionOverwrite(read_messages=True, send_messages=True),
            interaction.guild.me: discord.PermissionOverwrite(read_messages=True, send_messages=True, manage_messages=True, manage_channels=True),
        }

        channel = await interaction.guild.create_text_channel(
            f"ticket-{ticket_number}",
            category=category,
            overwrites=overwrites,
            topic=f"Ticket #{ticket_number} | Opened by {interaction.user}",
        )

        async with AsyncSessionLocal() as session:
            new_ticket = Ticket.__table__.insert().values(
                guild_id=guild_id,
                number=ticket_number,
                channel_id=str(channel.id),
                type="general",
                opened_by=str(interaction.user.id),
                status="open",
                created_at=datetime.utcnow(),
            )
            await session.execute(new_ticket)
            await session.commit()

        embed = discord.Embed(
            title=f"🎫 Ticket #{ticket_number}",
            description=f"Opened by {interaction.user.mention}\n\nPlease describe your issue and wait for support.",
            color=0xF2A93B,
        )
        embed.set_footer(text="Claim or close this ticket")

        view = TicketActionView(ticket_number, str(interaction.user.id), guild_id)
        await channel.send(embed=embed, view=view)

        await interaction.response.send_message(
            f"✅ Ticket created: {channel.mention}", ephemeral=True
        )


class TicketActionView(discord.ui.View):
    def __init__(self, ticket_number: int, owner_id: str, guild_id: str):
        super().__init__(timeout=None)
        self.ticket_number = ticket_number
        self.owner_id = owner_id
        self.guild_id = guild_id

    @discord.ui.button(
        label="Claim",
        style=discord.ButtonStyle.success,
        emoji="🙋",
        custom_id="ticket_claim_button",
    )
    async def claim(self, interaction: discord.Interaction, button: discord.ui.Button):
        async with AsyncSessionLocal() as session:
            await session.execute(
                Ticket.__table__.update()
                .where(
                    Ticket.c.guild_id == self.guild_id,
                    Ticket.c.number == self.ticket_number,
                )
                .values(
                    claimed_by=str(interaction.user.id),
                    claimed_at=datetime.utcnow(),
                    status="claimed",
                )
            )
            await session.commit()

        embed = interaction.message.embeds[0]
        embed.add_field(
            name="🙋 Claimed By",
            value=f"<@{interaction.user.id}>",
            inline=False,
        )
        embed.color = discord.Color.gold()
        await interaction.message.edit(embed=embed)

        await interaction.response.send_message(
            f"✅ Ticket claimed by {interaction.user.mention}", ephemeral=True
        )

    @discord.ui.button(
        label="Close",
        style=discord.ButtonStyle.danger,
        emoji="🔒",
        custom_id="ticket_close_button",
    )
    async def close(self, interaction: discord.Interaction, button: discord.ui.Button):
        if str(interaction.user.id) != self.owner_id and not interaction.user.guild_permissions.administrator:
            await interaction.response.send_message(
                "❌ Only the ticket owner or an admin can close this ticket.",
                ephemeral=True,
            )
            return

        await interaction.response.send_message(
            "🔒 This ticket will be closed in 5 seconds...", ephemeral=True
        )

        await asyncio.sleep(5)

        channel = interaction.channel
        if channel:
            await channel.set_permissions(
                interaction.guild.default_role,
                send_messages=False,
                read_messages=False,
            )

        # Collect transcript
        transcript = await build_transcript(channel, self.ticket_number, interaction.user)

        async with AsyncSessionLocal() as session:
            await session.execute(
                Ticket.__table__.update()
                .where(
                    Ticket.c.guild_id == self.guild_id,
                    Ticket.c.number == self.ticket_number,
                )
                .values(
                    status="closed",
                    closed_by=str(interaction.user.id),
                    closed_at=datetime.utcnow(),
                    transcript_content=transcript,
                )
            )
            await session.commit()

        # Send transcript to log channel
        config = ticket_configs.get(self.guild_id)
        if config and "log_channel_id" in config:
            log_channel = interaction.guild.get_channel(int(config["log_channel_id"]))
            if log_channel:
                file = discord.File(
                    StringIO(transcript),
                    filename=f"ticket-{self.ticket_number}.txt",
                )
                log_embed = discord.Embed(
                    title=f"🎫 Ticket #{self.ticket_number} Closed",
                    color=0x888888,
                )
                log_embed.add_field(name="Ticket", value=str(self.ticket_number))
                log_embed.add_field(name="Owner", value=self.owner_id)
                log_embed.add_field(name="Closed By", value=str(interaction.user.id), inline=False)
                await log_channel.send(embed=log_embed, file=file)

        # Delete the channel
        await asyncio.sleep(1)
        await channel.delete(reason=f"Ticket #{self.ticket_number} closed by {interaction.user.display_name}")


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
        content = msg.content if msg.content else (f"[{msg.attachments[0].filename if msg.attachments else "embed"}]")
        lines.append(f"[{timestamp}] {author}: {content}")
        lines.append("")

    lines.append("=== End of Transcript ===")
    return "\n".join(lines)


@bot.tree.command(name="ticket-stats", description="Show ticket statistics")
@app_commands.checks.has_permissions(administrator=True)
async def ticket_stats(interaction: discord.Interaction):
    guild_id = str(interaction.guild_id)

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            Ticket.__table__.select().where(Ticket.c.guild_id == guild_id)
        )
        tickets = result.fetchall()

    open_count = len([t for t in tickets if t.status == "open"])
    claimed_count = len([t for t in tickets if t.status == "claimed"])
    closed_count = len([t for t in tickets if t.status == "closed"])

    embed = discord.Embed(
        title="🎫 Ticket Statistics",
        color=0xF2A93B,
    )
    embed.add_field(name="Open", value=str(open_count), inline=True)
    embed.add_field(name="Claimed", value=str(claimed_count), inline=True)
    embed.add_field(name="Closed", value=str(closed_count), inline=True)
    embed.add_field(name="Total", value=str(len(tickets)), inline=False)

    await interaction.response.send_message(embed=embed, ephemeral=True)


if __name__ == "__main__":
    token = os.getenv("DISCORD_TOKEN")
    if not token:
        raise ValueError("DISCORD_TOKEN not found in environment")
    bot.run(token)
