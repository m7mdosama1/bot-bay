#!/usr/bin/env python3
"""
Bot Bay — Unified Deploy Script
Deploys all Discord bots to Railway and the web dashboard to Vercel.

Usage:
    python deploy.py deploy-all         # Deploy bots to Railway + web to Vercel
    python deploy.py deploy bots        # Deploy all bots to Railway
    python deploy.py deploy web         # Deploy web to Vercel
    python deploy.py deploy bot-verification  # Deploy a single bot
    python deploy.py link-all           # Link all services to Railway project
    python deploy.py list               # List all available services
"""

import sys
import codecs
sys.stdout = codecs.getwriter("utf-8")(sys.stdout.buffer)

import subprocess
import os
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent

BOTS = {
    "bot-verification": {
        "path": "apps/bot-verification",
        "description": "Sentinel Verify — Anti-alt & VPN verification",
        "required_env": ["DISCORD_TOKEN", "DATABASE_URL"],
    },
    "bot-giveaway": {
        "path": "apps/bot-giveaway",
        "description": "Bounty Drop — Automated giveaways",
        "required_env": ["DISCORD_TOKEN", "DATABASE_URL"],
    },
    "bot-roulette": {
        "path": "apps/bot-roulette",
        "description": "Fortune Wheel — Interactive roulette with betting",
        "required_env": ["DISCORD_TOKEN", "DATABASE_URL"],
    },
    "bot-admin": {
        "path": "apps/bot-admin",
        "description": "Iron Gavel — Moderation toolkit",
        "required_env": ["DISCORD_TOKEN", "DATABASE_URL"],
    },
    "bot-ticket": {
        "path": "apps/bot-ticket",
        "description": "Deskline — Persistent ticket system",
        "required_env": ["DISCORD_TOKEN", "DATABASE_URL"],
    },
    "bot-welcome": {
        "path": "apps/bot-welcome",
        "description": "Threshold — Welcome channels with rule acceptance",
        "required_env": ["DISCORD_TOKEN", "DATABASE_URL"],
    },
}

WEB = {
    "path": "apps/web",
    "description": "Web Dashboard & Bot Catalog",
    "required_env": ["DATABASE_URL", "NEXTAUTH_URL", "NEXTAUTH_SECRET"],
}


def run(cmd, cwd=None, check=True):
    """Run a shell command and print output."""
    print(f"  → {cmd}")
    result = subprocess.run(
        cmd, shell=True, cwd=cwd or ROOT,
        capture_output=True, text=True
    )
    if result.stdout.strip():
        print(result.stdout.rstrip())
    if result.stderr.strip():
        print(result.stderr.rstrip(), file=sys.stderr)
    if check and result.returncode != 0:
        raise RuntimeError(f"Command failed: {cmd}")
    return result


def check_cli(tool: str):
    """Verify a CLI tool is installed."""
    result = subprocess.run(f"{tool} --version", shell=True, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"❌ {tool.title()} CLI not found.")
        if tool == "railway":
            print("   Install: npm install -g railway")
        elif tool == "vercel":
            print("   Install: npm install -g vercel")
        sys.exit(1)
    print(f"✅ {tool.title()} CLI: {result.stdout.strip()}")


def prepare_env(service_path: str, service_name: str):
    """Ensure .env exists, copy from .env.example if missing."""
    env_path = ROOT / service_path / ".env"
    if not env_path.exists():
        example = ROOT / service_path / ".env.example"
        if example.exists():
            shutil.copy2(example, env_path)
            print(f"   ⚠️  Created .env from .env.example for {service_name}")
            print(f"   ⚠️  Please edit {env_path} with your real values before deploying!")
            return False
        else:
            print(f"   ❌ No .env.example found for {service_name}")
            return False
    return True


def verify_env(service_path: str, service_name: str, required_vars: list):
    """Check that required env vars are set in .env."""
    env_path = ROOT / service_path / ".env"
    if not env_path.exists():
        return

    with open(env_path) as f:
        lines = [l.strip() for l in f.readlines()]

    missing = []
    for var in required_vars:
        value = None
        for line in lines:
            if line.startswith(f"{var}="):
                value = line.split("=", 1)[1].strip()
                break
        if not value or "your_" in value.lower() or "placeholder" in value.lower():
            missing.append(var)

    if missing:
        print(f"   ⚠️  Missing or placeholder env vars in {service_name}: {', '.join(missing)}")


def deploy_bot(name):
    """Deploy a single bot to Railway."""
    if name not in BOTS:
        print(f"❌ Unknown bot: {name}")
        return False

    info = BOTS[name]
    print(f"\n🚀 Deploying {name} to Railway ({info['description']})...")

    if not prepare_env(info["path"], name):
        return False
    verify_env(info["path"], name, info["required_env"])

    try:
        run("railway up", cwd=str(ROOT / info["path"]))
        print(f"✅ {name} deployed to Railway!")
        return True
    except RuntimeError as e:
        print(f"❌ Failed to deploy {name}: {e}")
        return False


def deploy_web():
    """Deploy the web dashboard to Vercel."""
    print(f"\n🚀 Deploying web to Vercel ({WEB['description']})...")

    if not prepare_env(WEB["path"], "web"):
        return False
    verify_env(WEB["path"], "web", WEB["required_env"])

    try:
        run("vercel --prod", cwd=str(ROOT / WEB["path"]))
        print(f"✅ web deployed to Vercel!")
        return True
    except RuntimeError as e:
        print(f"❌ Failed to deploy web: {e}")
        return True


def deploy_all_bots():
    """Deploy all bots to Railway."""
    print("\n🚀 Deploying all bots to Railway...")
    check_cli("railway")

    results = {}
    for name in BOTS:
        results[name] = deploy_bot(name)

    print("\n" + "=" * 60)
    print("  Railway Deploy Summary")
    print("=" * 60)
    for name, success in results.items():
        status = "✅" if success else "⚠️"
        print(f"  {status} {name}")

    return all(results.values())


def deploy_all():
    """Deploy all bots to Railway + web to Vercel."""
    print("\n" + "=" * 60)
    print("  Bot Bay — Unified Deploy (Railway bots + Vercel web)")
    print("=" * 60)

    bots_ok = deploy_all_bots()
    web_ok = deploy_web()

    print("\n" + "=" * 60)
    print("  Deploy Complete")
    print("=" * 60)
    if bots_ok and web_ok:
        print("✅ All services deployed successfully!")
    else:
        print("⚠️  Some services may need attention (see above)")


def list_services():
    """List all available services."""
    print("\n📦 Available Services:\n")
    print("  Railway (Bots):")
    for name, info in BOTS.items():
        print(f"    {name}")
        print(f"      → {info['description']}")
    print(f"\n  Vercel (Web):")
    print(f"    web")
    print(f"      → {WEB['description']}")
    print()


def link_all():
    """Link all bot directories to a Railway project."""
    print("\n🔗 Linking bot services to Railway project...")
    check_cli("railway")

    for name in BOTS:
        service_path = ROOT / BOTS[name]["path"]
        print(f"\n  Linking {name}...")
        try:
            run("railway link", cwd=str(service_path))
        except RuntimeError:
            print(f"   Skip: {name} may already be linked")


if __name__ == "__main__":
    args = sys.argv[1:]

    if not args or args[0] in ("deploy-all", "all"):
        deploy_all()
    elif args[0] == "deploy":
        if len(args) < 2:
            print("Usage: python deploy.py deploy <bots|web|bot-name>")
            sys.exit(1)
        target = args[1]
        if target == "bots":
            deploy_all_bots()
        elif target == "web":
            deploy_web()
        elif target in BOTS:
            deploy_bot(target)
        else:
            print(f"Unknown target: {target}")
            print(f"Available: bots, web, {', '.join(BOTS.keys())}")
            sys.exit(1)
    elif args[0] == "link-all":
        link_all()
    elif args[0] == "list":
        list_services()
    else:
        print(__doc__)
        print(f"\nAvailable bots: {', '.join(BOTS.keys())}")
