#!/usr/bin/env python3
"""
Bot Bay — Unified Deploy Script
Deploys all Discord bots (as single service) to Railway and web to Vercel.

Usage:
    python deploy.py deploy-all         # Deploy bots to Railway + web to Vercel
    python deploy.py deploy bots        # Deploy bot-runner to Railway
    python deploy.py deploy web         # Deploy web to Vercel
    python deploy.py link-all           # Link services to Railway/Vercel projects
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

BOT_RUNNER = {
    "path": "apps/bot-runner",
    "description": "Unified runner — all 6 Discord bots in one Railway service",
    "required_env": [
        "BOT_VERIFICATION_TOKEN",
        "BOT_GIVEAWAY_TOKEN",
        "BOT_ROULETTE_TOKEN",
        "BOT_ADMIN_TOKEN",
        "BOT_WELCOME_TOKEN",
        "BOT_TICKET_TOKEN",
        "DATABASE_URL",
    ],
}

WEB = {
    "path": "apps/web",
    "description": "Web Dashboard & Bot Catalog",
    "required_env": ["DATABASE_URL", "NEXTAUTH_URL", "NEXTAUTH_SECRET"],
}

ALL_BOTS = [
    "bot-verification",
    "bot-giveaway",
    "bot-roulette",
    "bot-admin",
    "bot-ticket",
    "bot-welcome",
]


def run(cmd, cwd=None, check=True):
    """Run a shell command and print output."""
    print(f"  -> {cmd}")
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
        print(f"[FAIL] {tool} CLI not found.")
        if tool == "railway":
            print("   Install: npm install -g railway")
        elif tool == "vercel":
            print("   Install: npm install -g vercel")
        sys.exit(1)
    print(f"[OK] {tool} CLI: {result.stdout.strip()}")


def prepare_env(service_path: str, service_name: str):
    """Ensure .env exists, copy from .env.example if missing."""
    env_path = ROOT / service_path / ".env"
    if not env_path.exists():
        example = ROOT / service_path / ".env.example"
        if example.exists():
            shutil.copy2(example, env_path)
            print(f"   Created .env from .env.example for {service_name}")
            print(f"   Please edit {env_path} with your real values before deploying!")
            return False
        else:
            print(f"   No .env.example found for {service_name}")
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
        if not value or "your_" in value.lower() or "placeholder" in value.lower() or "your_bot" in value.lower():
            missing.append(var)

    if missing:
        print(f"   Missing or placeholder env vars in {service_name}: {', '.join(missing)}")


def deploy_bots():
    """Deploy the unified bot-runner to Railway."""
    print("\n[OK] Deploying bots to Railway...")
    check_cli("railway")

    print(f"\n  Service: bot-runner ({BOT_RUNNER['description']})")
    print(f"  Path:    {BOT_RUNNER['path']}")
    print(f"  Bots:    {', '.join(ALL_BOTS)}")

    if not prepare_env(BOT_RUNNER["path"], "bot-runner"):
        return False
    verify_env(BOT_RUNNER["path"], "bot-runner", BOT_RUNNER["required_env"])

    try:
        run("railway up", cwd=str(ROOT / BOT_RUNNER["path"]))
        print("\n[OK] Bot runner deployed to Railway!")
        return True
    except RuntimeError as e:
        print(f"\n[FAIL] Failed to deploy bots: {e}")
        return False


def deploy_web():
    """Deploy the web dashboard to Vercel."""
    print(f"\n[OK] Deploying web to Vercel ({WEB['description']})...")

    if not prepare_env(WEB["path"], "web"):
        return False
    verify_env(WEB["path"], "web", WEB["required_env"])

    try:
        run("vercel --prod", cwd=str(ROOT / WEB["path"]))
        print("\n[OK] web deployed to Vercel!")
        return True
    except RuntimeError as e:
        print(f"\n[FAIL] Failed to deploy web: {e}")
        return True


def deploy_all():
    """Deploy bots to Railway + web to Vercel."""
    print("\n" + "=" * 60)
    print("  Bot Bay — Unified Deploy")
    print("  Bots -> Railway (single service)")
    print("  Web  -> Vercel")
    print("=" * 60)

    bots_ok = deploy_bots()
    web_ok = deploy_web()

    print("\n" + "=" * 60)
    print("  Deploy Complete")
    print("=" * 60)
    if bots_ok and web_ok:
        print("[OK] All services deployed successfully!")
    else:
        print("[WARN] Some services may need attention (see above)")


def list_services():
    """List all available services."""
    print("\n  Available Services:\n")
    print("  Railway:")
    print(f"    bot-runner")
    print(f"      -> {BOT_RUNNER['description']}")
    print(f"      -> Contains: {', '.join(ALL_BOTS)}")
    print(f"\n  Vercel:")
    print(f"    web")
    print(f"      -> {WEB['description']}")
    print()


def link_all():
    """Link services to projects."""
    print("\n[OK] Linking services...")
    check_cli("railway")

    print("\n  Linking bot-runner to Railway...")
    try:
        run("railway link", cwd=str(ROOT / BOT_RUNNER["path"]))
    except RuntimeError:
        print("   Skip: may already be linked")

    check_cli("vercel")
    print("\n  Linking web to Vercel...")
    try:
        run("vercel link", cwd=str(ROOT / WEB["path"]))
    except RuntimeError:
        print("   Skip: may already be linked")


if __name__ == "__main__":
    args = sys.argv[1:]

    if not args or args[0] in ("deploy-all", "all"):
        deploy_all()
    elif args[0] == "deploy":
        if len(args) < 2:
            print("Usage: python deploy.py deploy <bots|web>")
            sys.exit(1)
        target = args[1]
        if target == "bots":
            deploy_bots()
        elif target == "web":
            deploy_web()
        else:
            print(f"Unknown target: {target}")
            print("Available: bots, web")
            sys.exit(1)
    elif args[0] == "link-all":
        link_all()
    elif args[0] == "list":
        list_services()
    else:
        print(__doc__)
