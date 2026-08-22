#!/usr/bin/env python3
"""
Bot Bay — Unified Bot Runner
Runs all 6 Discord bots in a single process pool.

Each bot runs as a subprocess with its own environment variables.
If a bot crashes, it is automatically restarted (up to 5 attempts per minute).

Usage:
    python run-all-bots.py
"""

import os
import sys
import time
import signal
import subprocess
import threading
from pathlib import Path
from datetime import datetime

ROOT = Path(__file__).resolve().parent.parent.parent

# Each bot: name -> (dir, token_env_var, extra_env)
BOTS = [
    {
        "name": "Sentinel Verify (bot-verification)",
        "dir": "apps/bot-verification",
        "token_env": "BOT_VERIFICATION_TOKEN",
    },
    {
        "name": "Bounty Drop (bot-giveaway)",
        "dir": "apps/bot-giveaway",
        "token_env": "BOT_GIVEAWAY_TOKEN",
    },
    {
        "name": "Fortune Wheel (bot-roulette)",
        "dir": "apps/bot-roulette",
        "token_env": "BOT_ROULETTE_TOKEN",
    },
    {
        "name": "Iron Gavel (bot-admin)",
        "dir": "apps/bot-admin",
        "token_env": "BOT_ADMIN_TOKEN",
    },
    {
        "name": "Deskline (bot-ticket)",
        "dir": "apps/bot-ticket",
        "token_env": "BOT_TICKET_TOKEN",
    },
    {
        "name": "Threshold (bot-welcome)",
        "dir": "apps/bot-welcome",
        "token_env": "BOT_WELCOME_TOKEN",
    },
]

shutdown_event = threading.Event()


def log(bot_name, msg):
    """Thread-safe logging with timestamp and bot name."""
    ts = datetime.now().strftime("%H:%M:%S")
    print(f"[{ts}] [{bot_name}] {msg}", flush=True)


def load_bot_env(bot):
    """Build the environment dict for a single bot subprocess."""
    env = os.environ.copy()

    # Set the bot's Discord token from the uniquely-named env var
    token = env.get(bot["token_env"], "")
    env["DISCORD_TOKEN"] = token

    # Shared env vars — always ensure DATABASE_URL is a valid string
    database_url = os.getenv("DATABASE_URL", "").strip()
    env["DATABASE_URL"] = database_url if database_url else "sqlite+aiosqlite:///bot-bay.db"

    # Bot-specific extra vars
    if bot["dir"] == "apps/bot-verification":
        env.setdefault("IPQUALITYSCORE_API_KEY", "")
        env.setdefault("PROXYCHECK_API_KEY", "")
    if bot["dir"] == "apps/bot-welcome":
        env.setdefault("VERIFIED_ROLE_ID", "")

    if not token:
        log(bot["name"], "⚠️ DISCORD_TOKEN not set — bot will fail to start")

    return env


def run_bot(bot):
    """Run a single bot in a subprocess with auto-restart."""
    name = bot["name"]
    bot_dir = ROOT / bot["dir"]
    env = load_bot_env(bot)

    restart_count = 0
    restart_timestamps = []

    while not shutdown_event.is_set():
        log(name, f"→ Starting (attempt {restart_count + 1})")

        proc = subprocess.Popen(
            [sys.executable, "bot.py"],
            cwd=str(bot_dir),
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
        )

        # Stream output
        for line in proc.stdout:
            if shutdown_event.is_set():
                proc.terminate()
                break
            log(name, line.rstrip())

        proc.wait()
        exit_code = proc.returncode

        if shutdown_event.is_set():
            log(name, "⏹️ Stopping (shutdown requested)")
            break

        restart_count += 1

        # Rate limit: max 5 restarts per minute
        now = time.time()
        restart_timestamps = [t for t in restart_timestamps if now - t < 60]
        restart_timestamps.append(now)

        if len(restart_timestamps) > 5:
            log(name, f"❌ Crashed too many times (exit code {exit_code}). Giving up.")
            break

        if exit_code != 0:
            log(name, f"⚠️ Exited with code {exit_code}. Restarting in 10s...")
            time.sleep(10)


def main():
    print("=" * 60, flush=True)
    print("  Bot Bay — Unified Bot Runner", flush=True)
    print("  Running 6 Discord bots in one process pool", flush=True)
    print("=" * 60, flush=True)

    # Verify at least one token is set
    has_any_token = any(
        os.getenv(bot["token_env"], "").strip() and not os.getenv(bot["token_env"], "").strip().startswith("your_")
        for bot in BOTS
    )
    if not has_any_token:
        print("\n[FAIL] No Discord tokens found in environment!")
        print("   Set the following env vars in your Railway project:")
        for bot in BOTS:
            print(f"     {bot['token_env']}=your_bot_token_here")
        print()
        sys.exit(1)

    # Start each bot in its own thread
    threads = []
    for bot in BOTS:
        token = os.getenv(bot["token_env"], "").strip()
        if not token or token.startswith("your_"):
            print(f"  [SKIP] {bot['name']} — set {bot['token_env']} env var to enable", flush=True)
            continue
        t = threading.Thread(target=run_bot, args=(bot,), daemon=False)
        t.start()
        threads.append(t)
        log(bot["name"], f"Launched. Token source: {bot['token_env']}")
        time.sleep(2)

    if not threads:
        print("\n[FAIL] No bot tokens are set! Exiting.")
        print("   Set these env vars in your Railway project:")
        for bot in BOTS:
            print(f"     {bot['token_env']}=your_discord_bot_token")
        sys.exit(1)

    print(f"\n[OK] {len(threads)} bot(s) starting. Waiting for processes...\n", flush=True)

    # Handle shutdown signals
    def signal_handler(signum, frame):
        print("\n⏹️ Shutdown signal received. Stopping all bots...", flush=True)
        shutdown_event.set()
        time.sleep(2)
        sys.exit(0)

    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    # Keep main thread alive
    try:
        while not shutdown_event.is_set():
            time.sleep(1)
    except KeyboardInterrupt:
        signal_handler(None, None)


if __name__ == "__main__":
    main()
