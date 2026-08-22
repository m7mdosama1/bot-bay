#!/usr/bin/env python3
"""
Create database tables in PostgreSQL for Bot Bay bots.
Run this before starting the bots to ensure tables exist.
"""

import os
import sys

ROOT = os.path.join(os.path.dirname(__file__), "..", "..", "packages", "db")
sys.path.insert(0, ROOT)

from shared_models import Base
from sqlalchemy.ext.asyncio import create_async_engine
import asyncio


async def create_tables():
    database_url = os.getenv("DATABASE_URL", "").strip()
    if database_url:
        if database_url.startswith("postgres://"):
            database_url = "postgresql+asyncpg://" + database_url[len("postgres://"):]
        elif database_url.startswith("postgresql://"):
            database_url = "postgresql+asyncpg://" + database_url[len("postgresql://"):]
        if "?" in database_url:
            database_url = database_url.split("?")[0]
        connect_args = {"ssl": "require"} if database_url.startswith("postgresql") else {}
    else:
        database_url = "sqlite+aiosqlite:///bot-bay.db"
        connect_args = {}

    engine = create_async_engine(database_url, echo=False, connect_args=connect_args)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    await engine.dispose()
    print("[OK] Database tables created successfully", flush=True)


if __name__ == "__main__":
    asyncio.run(create_tables())