import asyncio
import json
import os
import sys
import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET

import discord
from discord import app_commands
from discord.ext import commands, tasks
from dotenv import load_dotenv
from sqlalchemy import select

load_dotenv()

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, ROOT)
from shared.db.models import Feed
from shared.db.session import Session, init_db

intents = discord.Intents.default()
intents.guilds = True
bot = commands.Bot(command_prefix="!", intents=intents)
twitch_token: str | None = None


def embed_for(feed: Feed, item: dict) -> discord.Embed:
    template = json.loads(feed.embed_template or "{}")
    is_live = feed.platform in {"twitch", "kick"} or item.get("is_live", False)
    stream_title = item.get("title") or f"{item.get('channel_name', feed.source_ref)} is live now"
    embed = discord.Embed(
        title=template.get("title", f"{item.get('channel_name', feed.source_ref)} is LIVE" if is_live else f"{feed.platform.upper()} UPDATE"),
        description=stream_title,
        url=item.get("url"),
        color=int(template.get("color", "0xDCA85D" if is_live else "0xF2A93B"), 16),
    )
    if item.get("channel_name"):
        author = {"name": f"{item['channel_name']} • {feed.platform.title()}"}
        if item.get("avatar_url"):
            author["icon_url"] = item["avatar_url"]
        embed.set_author(**author)
    if is_live:
        embed.add_field(name="Category", value=item.get("category") or "Just Chatting", inline=True)
        embed.add_field(name="Viewers", value=f"{item.get('viewers', 0):,}", inline=True)
        embed.add_field(name="Status", value="🔴 Live now", inline=True)
    else:
        embed.add_field(name="Source", value=feed.source_ref, inline=False)
    if item.get("thumbnail"):
        embed.set_image(url=item["thumbnail"])
    footer = "Beacon • Live notification" if is_live else f"Beacon • {feed.platform.upper()}"
    embed.set_footer(text=footer)
    if item.get("started_at"):
        embed.timestamp = discord.utils.parse_time(item["started_at"])
    return embed


async def read_feed(feed: Feed) -> dict | None:
    if feed.platform == "twitch":
        return await twitch_live(feed.source_ref)
    if feed.platform == "kick":
        return await kick_live(feed.source_ref)

    def fetch() -> dict | None:
        with urllib.request.urlopen(feed.source_ref, timeout=15) as response:
            root = ET.fromstring(response.read())
        item = root.find(".//item") or root.find(".//{http://www.w3.org/2005/Atom}entry")
        if item is None:
            return None
        def text(name: str) -> str:
            node = item.find(name) or item.find(f"{{http://www.w3.org/2005/Atom}}{name}")
            return (node.text or "") if node is not None else ""
        return {"id": text("guid") or text("id") or text("link"), "title": text("title"), "url": text("link"), "published": text("pubDate") or text("published")}
    return await asyncio.to_thread(fetch)


async def twitch_live(channel: str) -> dict | None:
    global twitch_token

    def fetch() -> dict | None:
        global twitch_token
        client_id = os.getenv("TWITCH_CLIENT_ID", "").strip()
        client_secret = os.getenv("TWITCH_CLIENT_SECRET", "").strip()
        if not client_id or not client_secret:
            raise RuntimeError("TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET are required")
        if not twitch_token:
            token_request = urllib.request.Request(
                "https://id.twitch.tv/oauth2/token",
                data=urllib.parse.urlencode({"client_id": client_id, "client_secret": client_secret, "grant_type": "client_credentials"}).encode(),
                method="POST",
            )
            with urllib.request.urlopen(token_request, timeout=15) as response:
                twitch_token = json.loads(response.read())["access_token"]
        query = urllib.parse.urlencode({"user_login": channel.strip().lstrip("@").split("/")[-1]})
        request = urllib.request.Request(f"https://api.twitch.tv/helix/streams?{query}", headers={"Client-ID": client_id, "Authorization": f"Bearer {twitch_token}"})
        with urllib.request.urlopen(request, timeout=15) as response:
            streams = json.loads(response.read()).get("data", [])
        if not streams:
            return None
        stream = streams[0]
        thumbnail = stream.get("thumbnail_url", "").replace("{width}", "1280").replace("{height}", "720")
        return {
            "id": f"twitch:{stream['id']}",
            "title": stream.get("title") or f"{stream['user_name']} is live on Twitch",
            "channel_name": stream.get("user_name") or channel.strip().lstrip("@"),
            "url": f"https://twitch.tv/{stream.get('user_login') or channel.strip().lstrip('@')}",
            "category": stream.get("game_name") or "Just Chatting",
            "viewers": stream.get("viewer_count", 0),
            "thumbnail": thumbnail,
            "started_at": stream.get("started_at", ""),
        }

    return await asyncio.to_thread(fetch)


async def kick_live(channel: str) -> dict | None:
    def fetch() -> dict | None:
        client_id = os.getenv("KICK_CLIENT_ID", "").strip()
        client_secret = os.getenv("KICK_CLIENT_SECRET", "").strip()
        if not client_id or not client_secret:
            raise RuntimeError("KICK_CLIENT_ID and KICK_CLIENT_SECRET are required")
        token_request = urllib.request.Request(
            os.getenv("KICK_TOKEN_URL", "https://id.kick.com/oauth/token"),
            data=urllib.parse.urlencode({"client_id": client_id, "client_secret": client_secret, "grant_type": "client_credentials"}).encode(),
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            method="POST",
        )
        with urllib.request.urlopen(token_request, timeout=15) as response:
            token = json.loads(response.read()).get("access_token")
        slug = channel.strip().lstrip("@").split("/")[-1]
        base = os.getenv("KICK_API_BASE", "https://api.kick.com/public/v1").rstrip("/")
        query = urllib.parse.urlencode({"slug": slug})
        request = urllib.request.Request(f"{base}/channels?{query}", headers={"Authorization": f"Bearer {token}", "Client-Id": client_id})
        with urllib.request.urlopen(request, timeout=15) as response:
            payload = json.loads(response.read())
        channel_data = (payload.get("data") or [{}])[0]
        stream = channel_data.get("livestream") or channel_data.get("stream") or {}
        if not stream or stream.get("is_live") is False or not stream.get("stream_id", stream.get("id")):
            return None
        stream_id = stream.get("stream_id", stream.get("id"))
        return {
            "id": f"kick:{stream_id}",
            "title": stream.get("session_title") or stream.get("title") or f"{channel_data.get('user_name', slug)} is live on Kick",
            "channel_name": channel_data.get("user_name") or slug,
            "url": f"https://kick.com/{slug}",
            "category": (stream.get("category") or {}).get("name") if isinstance(stream.get("category"), dict) else stream.get("category", ""),
            "viewers": stream.get("viewer_count", 0),
            "thumbnail": stream.get("thumbnail_url") or stream.get("thumbnail", ""),
            "started_at": stream.get("started_at", ""),
        }

    return await asyncio.to_thread(fetch)


@tasks.loop(seconds=120)
async def poll_feeds():
    async with Session() as session:
        feeds = (await session.scalars(select(Feed).where(Feed.enabled.is_(True)))).all()
        for feed in feeds:
            if feed.platform not in {"rss", "youtube", "twitch", "kick", "github", "reddit"}:
                continue
            try:
                item = await read_feed(feed)
                if not item or not item["id"] or item["id"] == feed.last_posted_ref:
                    continue
                channel = bot.get_channel(int(feed.target_channel_id))
                if channel:
                    view = None
                    if item.get("url"):
                        view = discord.ui.View(timeout=None)
                        view.add_item(discord.ui.Button(label="Watch live" if feed.platform in {"twitch", "kick"} else "Open source", url=item["url"], emoji="🔴" if feed.platform in {"twitch", "kick"} else "🔗"))
                    await channel.send(embed=embed_for(feed, item), view=view)
                    feed.last_posted_ref = item["id"]
            except Exception as error:
                print(f"Beacon feed {feed.id} failed: {error}")
        await session.commit()


@bot.event
async def on_ready():
    await init_db()
    await bot.tree.sync()
    if not poll_feeds.is_running():
        poll_feeds.change_interval(seconds=max(30, int(os.getenv("BEACON_POLL_SECONDS", "120"))))
        poll_feeds.start()
    print(f"Beacon online as {bot.user}")


@bot.event
async def setup_hook():
    bot.add_view(BeaconPanel())


class FeedModal(discord.ui.Modal, title="Add Beacon feed"):
    source_url = discord.ui.TextInput(label="Feed URL or channel slug", placeholder="RSS URL, Twitch login, or Kick slug", required=True)
    platform = discord.ui.TextInput(label="Platform", placeholder="rss, twitch, or kick", default="rss", max_length=20)

    async def on_submit(self, interaction: discord.Interaction):
        if self.platform.value.lower().strip() not in {"rss", "twitch", "kick"}:
            await interaction.response.send_message(embed=discord.Embed(title="Beacon", description="Use rss, twitch, or kick as the platform.", color=0xD97968), ephemeral=True)
            return
        async with Session() as session:
            session.add(Feed(guild_id=str(interaction.guild_id), platform=self.platform.value.lower().strip(), source_ref=self.source_url.value.strip(), target_channel_id=str(interaction.channel_id)))
            await session.commit()
        await interaction.response.send_message(embed=discord.Embed(title="Beacon feed added", description="New updates will be delivered to this channel.", color=0x58C8A5), ephemeral=True)


class BeaconPanel(discord.ui.View):
    def __init__(self):
        super().__init__(timeout=None)

    @discord.ui.button(label="Add feed", style=discord.ButtonStyle.success, emoji="➕", custom_id="beacon_add_feed")
    async def add(self, interaction: discord.Interaction, button: discord.ui.Button):
        if not interaction.user.guild_permissions.manage_guild:
            await interaction.response.send_message(embed=discord.Embed(title="Beacon", description="Manage Server permission required.", color=0xD97968), ephemeral=True)
            return
        await interaction.response.send_modal(FeedModal())

    @discord.ui.button(label="My feeds", style=discord.ButtonStyle.secondary, emoji="📋", custom_id="beacon_list_feeds")
    async def list_feeds(self, interaction: discord.Interaction, button: discord.ui.Button):
        async with Session() as session:
            rows = (await session.scalars(select(Feed).where(Feed.guild_id == str(interaction.guild_id), Feed.enabled.is_(True)))).all()
        description = "\n".join(f"`{feed.platform}` {feed.source_ref} → <#{feed.target_channel_id}>" for feed in rows) or "No feeds configured yet."
        await interaction.response.send_message(embed=discord.Embed(title="Beacon feeds", description=description, color=0xDCA85D), ephemeral=True)


@bot.tree.command(name="beacon-panel", description="Post the Beacon button panel")
@app_commands.checks.has_permissions(manage_guild=True)
async def beacon_panel(interaction: discord.Interaction):
    embed = discord.Embed(title="BEACON", description="Choose an action below. Feed notifications will appear here as rich embeds.", color=0xDCA85D)
    await interaction.channel.send(embed=embed, view=BeaconPanel())
    await interaction.response.send_message(embed=discord.Embed(title="Panel ready", description="Beacon controls were posted in this channel.", color=0x58C8A5), ephemeral=True)


@bot.tree.command(name="add_feed", description="Add an RSS/API feed to this server")
@app_commands.checks.has_permissions(manage_guild=True)
async def add_feed(interaction: discord.Interaction, platform: str, source_url: str, channel: discord.TextChannel):
    if platform.lower() not in {"rss", "youtube", "twitch", "kick", "github", "reddit"}:
        await interaction.response.send_message(embed=discord.Embed(title="Beacon", description="Unsupported platform.", color=0xE05252), ephemeral=True)
        return
    async with Session() as session:
        session.add(Feed(guild_id=str(interaction.guild_id), platform=platform.lower(), source_ref=source_url, target_channel_id=str(channel.id)))
        await session.commit()
    await interaction.response.send_message(embed=discord.Embed(title="Feed saved", description=f"{platform} updates will be sent to {channel.mention}.", color=0x42D392), ephemeral=True)


@bot.tree.command(name="feeds", description="List notification feeds")
async def feeds(interaction: discord.Interaction):
    async with Session() as session:
        rows = (await session.scalars(select(Feed).where(Feed.guild_id == str(interaction.guild_id), Feed.enabled.is_(True)))).all()
    description = "\n".join(f"`{feed.platform}` {feed.source_ref} -> <#{feed.target_channel_id}>" for feed in rows) or "No feeds configured."
    await interaction.response.send_message(embed=discord.Embed(title="Beacon feeds", description=description, color=0xF2A93B), ephemeral=True)


if __name__ == "__main__":
    token = os.getenv("DISCORD_TOKEN")
    if not token:
        raise ValueError("DISCORD_TOKEN not found in environment")
    bot.run(token)