import os
import sys
from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
if str(ROOT / "packages" / "db") not in sys.path:
    sys.path.insert(0, str(ROOT / "packages" / "db"))

from packages.db.shared_models import Base  # noqa: E402
from shared.db import models  # noqa: F401,E402


def database_url() -> str:
    default = f"sqlite+aiosqlite:///{(ROOT / 'bot-bay.db').as_posix()}"
    value = os.getenv("DATABASE_URL", default).strip()
    if value.startswith("postgres://"):
        value = "postgresql+asyncpg://" + value[len("postgres://"):]
    elif value.startswith("postgresql://"):
        value = "postgresql+asyncpg://" + value[len("postgresql://"):]
    return value


engine = create_async_engine(database_url(), echo=False)
Session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def init_db() -> None:
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)