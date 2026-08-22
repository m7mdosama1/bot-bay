from sqlalchemy import String, Integer, Text, DateTime, Boolean, ForeignKey, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from datetime import datetime
import uuid


def generate_id() -> str:
    """Generate a short unique ID (compatible with Prisma's cuid)."""
    return uuid.uuid4().hex[:25]


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    username: Mapped[str] = mapped_column(String)
    avatar: Mapped[str] = mapped_column(String, nullable=True)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Bot(Base):
    __tablename__ = "bots"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_id)
    slug: Mapped[str] = mapped_column(String, unique=True)
    name: Mapped[str] = mapped_column(String)
    tagline: Mapped[str] = mapped_column(String)
    description: Mapped[str] = mapped_column(String)
    features: Mapped[str] = mapped_column(String)
    client_id: Mapped[str] = mapped_column(String)
    permissions: Mapped[str] = mapped_column(String)
    icon_url: Mapped[str] = mapped_column(String, nullable=True)
    color_accent: Mapped[str] = mapped_column(String, default="#F2A93B")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Guild(Base):
    __tablename__ = "guilds"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String)
    icon_url: Mapped[str] = mapped_column(String, nullable=True)
    owner_id: Mapped[str] = mapped_column(String)


class GuildBot(Base):
    __tablename__ = "guild_bots"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_id)
    guild_id: Mapped[str] = mapped_column(String)
    bot_id: Mapped[str] = mapped_column(String)
    added_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class Giveaway(Base):
    __tablename__ = "giveaways"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_id)
    guild_id: Mapped[str] = mapped_column(String)
    channel_id: Mapped[str] = mapped_column(String)
    message_id: Mapped[str] = mapped_column(String, nullable=True)
    prize: Mapped[str] = mapped_column(String)
    winners_count: Mapped[int] = mapped_column(Integer, default=1)
    ends_at: Mapped[datetime] = mapped_column(DateTime)
    status: Mapped[str] = mapped_column(String, default="active")
    created_by: Mapped[str] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class RouletteConfig(Base):
    __tablename__ = "roulette_configs"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_id)
    guild_id: Mapped[str] = mapped_column(String, unique=True)
    min_bet: Mapped[int] = mapped_column(Integer, default=10)
    max_bet: Mapped[int] = mapped_column(Integer, default=1000)
    currency_name: Mapped[str] = mapped_column(String, default="عملة")
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)


class ModerationLog(Base):
    __tablename__ = "moderation_logs"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_id)
    guild_id: Mapped[str] = mapped_column(String)
    action: Mapped[str] = mapped_column(String)
    target_user_id: Mapped[str] = mapped_column(String)
    moderator_id: Mapped[str] = mapped_column(String)
    reason: Mapped[str] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class VerificationConfig(Base):
    __tablename__ = "verification_configs"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_id)
    guild_id: Mapped[str] = mapped_column(String, unique=True)
    verify_channel_id: Mapped[str] = mapped_column(String)
    unverified_role_id: Mapped[str] = mapped_column(String)
    verified_role_id: Mapped[str] = mapped_column(String)
    vpn_check_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    alt_check_enabled: Mapped[bool] = mapped_column(Boolean, default=True)


class VerificationAttempt(Base):
    __tablename__ = "verification_attempts"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_id)
    guild_id: Mapped[str] = mapped_column(String)
    user_id: Mapped[str] = mapped_column(String)
    status: Mapped[str] = mapped_column(String)
    ip_hash: Mapped[str] = mapped_column(String, nullable=True)
    fingerprint_hash: Mapped[str] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class WelcomeConfig(Base):
    __tablename__ = "welcome_configs"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_id)
    guild_id: Mapped[str] = mapped_column(String, unique=True)
    category_id: Mapped[str] = mapped_column(String)
    message_text: Mapped[str] = mapped_column(String)
    image_url: Mapped[str] = mapped_column(String, nullable=True)
    delete_after_min: Mapped[int] = mapped_column(Integer, default=5)


class Ticket(Base):
    __tablename__ = "tickets"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_id)
    guild_id: Mapped[str] = mapped_column(String)
    number: Mapped[int] = mapped_column(Integer)
    channel_id: Mapped[str] = mapped_column(String)
    type: Mapped[str] = mapped_column(String, nullable=True)
    opened_by: Mapped[str] = mapped_column(String)
    claimed_by: Mapped[str] = mapped_column(String, nullable=True)
    closed_by: Mapped[str] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(String, default="open")
    transcript_content: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    claimed_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    closed_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
