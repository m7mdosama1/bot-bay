from datetime import datetime
import uuid

from sqlalchemy import Boolean, DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from packages.db.shared_models import Base


def gen_id() -> str:
    return uuid.uuid4().hex


class Feed(Base):
    __tablename__ = "feeds"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_id)
    guild_id: Mapped[str] = mapped_column(String, index=True)
    platform: Mapped[str] = mapped_column(String)
    source_ref: Mapped[str] = mapped_column(String)
    target_channel_id: Mapped[str] = mapped_column(String)
    embed_template: Mapped[str] = mapped_column(Text, default="{}")
    webhook_secret: Mapped[str | None] = mapped_column(String, nullable=True)
    last_posted_ref: Mapped[str | None] = mapped_column(String, nullable=True)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class DailyStat(Base):
    __tablename__ = "daily_stats"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_id)
    guild_id: Mapped[str] = mapped_column(String, index=True)
    date: Mapped[str] = mapped_column(String)
    new_members: Mapped[int] = mapped_column(Integer, default=0)
    messages_count: Mapped[int] = mapped_column(Integer, default=0)
    active_users: Mapped[int] = mapped_column(Integer, default=0)
    voice_minutes: Mapped[int] = mapped_column(Integer, default=0)


class MemberStat(Base):
    __tablename__ = "member_stats"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_id)
    guild_id: Mapped[str] = mapped_column(String, index=True)
    user_id: Mapped[str] = mapped_column(String)
    message_count: Mapped[int] = mapped_column(Integer, default=0)
    voice_minutes: Mapped[int] = mapped_column(Integer, default=0)
    last_active_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class ChannelStat(Base):
    __tablename__ = "channel_stats"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_id)
    guild_id: Mapped[str] = mapped_column(String, index=True)
    channel_id: Mapped[str] = mapped_column(String)
    date: Mapped[str] = mapped_column(String)
    message_count: Mapped[int] = mapped_column(Integer, default=0)


class UserXP(Base):
    __tablename__ = "user_xp"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_id)
    guild_id: Mapped[str] = mapped_column(String, index=True)
    user_id: Mapped[str] = mapped_column(String)
    xp: Mapped[int] = mapped_column(Integer, default=0)
    level: Mapped[int] = mapped_column(Integer, default=0)
    prestige: Mapped[int] = mapped_column(Integer, default=0)
    message_count: Mapped[int] = mapped_column(Integer, default=0)
    voice_minutes: Mapped[int] = mapped_column(Integer, default=0)
    streak_days: Mapped[int] = mapped_column(Integer, default=0)
    last_xp_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    last_active_date: Mapped[str | None] = mapped_column(String, nullable=True)


class LevelRole(Base):
    __tablename__ = "level_roles"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_id)
    guild_id: Mapped[str] = mapped_column(String, index=True)
    level: Mapped[int] = mapped_column(Integer)
    role_id: Mapped[str] = mapped_column(String)
    label: Mapped[str] = mapped_column(String)


class PulseConfig(Base):
    __tablename__ = "pulse_configs"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_id)
    guild_id: Mapped[str] = mapped_column(String, unique=True, index=True)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)


class AscendConfig(Base):
    __tablename__ = "ascend_configs"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_id)
    guild_id: Mapped[str] = mapped_column(String, unique=True, index=True)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    xp_cooldown_seconds: Mapped[int] = mapped_column(Integer, default=60)
    xp_per_message_min: Mapped[int] = mapped_column(Integer, default=15)
    xp_per_message_max: Mapped[int] = mapped_column(Integer, default=25)


class RouletteBalance(Base):
    __tablename__ = "roulette_balances"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_id)
    guild_id: Mapped[str] = mapped_column(String, index=True)
    user_id: Mapped[str] = mapped_column(String, index=True)
    balance: Mapped[int] = mapped_column(Integer, default=100)
    daily_claimed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class RouletteSession(Base):
    __tablename__ = "roulette_sessions"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_id)
    token_hash: Mapped[str] = mapped_column(String, unique=True, index=True)
    guild_id: Mapped[str] = mapped_column(String, index=True)
    user_id: Mapped[str] = mapped_column(String, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class RoulettePlay(Base):
    __tablename__ = "roulette_plays"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_id)
    guild_id: Mapped[str] = mapped_column(String, index=True)
    user_id: Mapped[str] = mapped_column(String, index=True)
    prediction: Mapped[str] = mapped_column(String)
    bet_amount: Mapped[int] = mapped_column(Integer)
    result_number: Mapped[int] = mapped_column(Integer)
    result_color: Mapped[str] = mapped_column(String)
    payout: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)