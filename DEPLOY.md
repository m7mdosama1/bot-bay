# 🚀 Bot Bay — Deployment Guide

Deploy all 6 Discord bots to **Railway** and the web dashboard to **Vercel** with a single command.

## Prerequisites

1. **Install CLIs**
   ```bash
   npm install -g railway vercel
   ```

2. **Login**
   ```bash
   railway login
   vercel login
   ```

3. **Create projects**
   ```bash
   cd bot-bay/apps/web
   vercel link  # Creates/link Vercel project for the web dashboard

   cd ../..     # Back to root
   railway init # Creates Railway project for the bots
   ```

## Quick Deploy — One Command (Bots + Web)

```bash
python deploy.py deploy-all
```

This deploys:
- **bot-runner** → **Railway** (all 6 Discord bots in a single service — stays within the 5-service limit)
- **web dashboard** → **Vercel** (production deployment)

---

## Deploy Bots Only (Railway)

```bash
python deploy.py deploy bots
# or: npm run deploy:bots  (from apps/web/)
```

---

## Deploy Web Only (Vercel)

```bash
python deploy.py deploy web
# or: npm run deploy  (from apps/web/)
```

---

## Other Commands

```bash
python deploy.py list        # List all services
python deploy.py link-all    # Link to Railway/Vercel projects
```

## Setup Steps (First Time)

### Step 1: Add a PostgreSQL Database on Railway

```bash
cd bot-bay/apps/bot-runner
railway plugin add postgresql
```

This automatically sets `DATABASE_URL` as an environment variable in your Railway project.

### Step 2: Configure Bot Environment Variables (Railway)

Set these in the Railway Dashboard → bot-runner service → Settings → Environment Variables:

| Variable | Description |
|----------|-------------|
| `BOT_VERIFICATION_TOKEN` | Discord token for Sentinel Verify |
| `BOT_GIVEAWAY_TOKEN` | Discord token for Bounty Drop |
| `BOT_ROULETTE_TOKEN` | Discord token for Fortune Wheel |
| `BOT_ADMIN_TOKEN` | Discord token for Iron Gavel |
| `BOT_WELCOME_TOKEN` | Discord token for Threshold |
| `BOT_TICKET_TOKEN` | Discord token for Deskline |
| `DATABASE_URL` | PostgreSQL URL (auto-set by Railway PG plugin) |
| `IPQUALITYSCORE_API_KEY` | (optional) IPQualityScore API key |
| `PROXYCHECK_API_KEY` | (optional) ProxyCheck.io API key |
| `VERIFIED_ROLE_ID` | (welcome bot only) Discord role ID |

### Step 3: Configure Web Environment Variables (Vercel)

In the Vercel Dashboard → Project → Settings → Environment Variables:

| Variable | Value |
|----------|-------|
| `NEXTAUTH_URL` | `https://your-app.vercel.app` |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` |
| `DISCORD_CLIENT_ID` | Discord OAuth client ID |
| `DISCORD_CLIENT_SECRET` | Discord OAuth client secret |
| `BOT_VERIFICATION_CLIENT_ID` | Discord bot application ID |
| `BOT_GIVEAWAY_CLIENT_ID` | Discord bot application ID |
| `BOT_ROULETTE_CLIENT_ID` | Discord bot application ID |
| `BOT_ADMIN_CLIENT_ID` | Discord bot application ID |
| `BOT_WELCOME_CLIENT_ID` | Discord bot application ID |
| `BOT_TICKET_CLIENT_ID` | Discord bot application ID |
| `ADMIN_SECRET_PATH` | A secret path for the admin panel |
| `ADMIN_ALLOWLIST` | Your Discord user ID |
| `DATABASE_URL` | PostgreSQL URL (same as Railway) |

### Step 4: Deploy All

```bash
python deploy.py deploy-all
```

## Project Structure

```
bot-bay/
├── apps/
│   ├── bot-verification/      # 🤖 Sentinel Verify
│   ├── bot-giveaway/          # 🎁 Bounty Drop
│   ├── bot-roulette/          # 🎰 Fortune Wheel
│   ├── bot-admin/             # ⚖️ Iron Gavel
│   ├── bot-ticket/            # 🎫 Deskline
│   ├── bot-welcome/           # 👋 Threshold
│   ├── bot-runner/            # 🏃 Unified runner (all bots → Railway)
│   │   └── run-all-bots.py    # Starts all 6 bots as subprocesses
│   └── web/                   # 🌐 Dashboard → Vercel
├── packages/db/               # Shared SQLAlchemy models
├── railway.json               # Railway config (single bot-runner service)
├── vercel.json                # Vercel config (web dashboard)
├── Dockerfile                 # Unified Docker build
├── deploy.py                  # Deploy script (Railway + Vercel)
├── deploy.js                  # Node.js wrapper
└── .env.example               # All env vars documented
```

## Notes

- All 6 bots run as subprocesses within a single Railway service (`bot-runner`), staying within the 5-service limit
- If a bot crashes, it is automatically restarted (up to 5 times per minute)
- All bots share the same PostgreSQL database via `packages/db/shared_models.py`
- Each bot's `bot.py` uses `sys.path.insert` to find the shared models
- The web dashboard auto-detects bots from the database on startup
- Run `python prisma/seed.ts` (from `apps/web/`) to populate the database with bot data
- The web dashboard and bots connect to the same database — set the same `DATABASE_URL` on both platforms

## Troubleshooting

- **Bot won't start**: Check `DISCORD_TOKEN` is set in Railway environment variables
- **Database errors**: Ensure the PostgreSQL plugin is added on Railway and `DATABASE_URL` matches on Vercel
- **Missing shared_models**: Verify the bot has `sys.path.insert` pointing to `packages/db`
- **Permission errors**: Ensure your Discord bot has the required intents and permissions enabled
- **Web dashboard can't connect**: Verify `DATABASE_URL` is set in Vercel environment variables (same as Railway)
- **Admin panel not found**: Verify `ADMIN_SECRET_PATH` matches on both Railway and Vercel
- **OAuth redirect errors**: Ensure `NEXTAUTH_URL` is set correctly in Vercel and matches your domain
