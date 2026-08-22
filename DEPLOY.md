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
- **6 bots** → Railway (sequentially, with auto-restart on failure)
- **web dashboard** → Vercel (production deployment)

---

## Deploy Bots Only (Railway)

```bash
python deploy.py deploy bots
# or: npm run deploy:bots  (from apps/web/)
```

### Deploy a Single Bot

```bash
python deploy.py deploy bot-verification
```

Available bots: `bot-verification`, `bot-giveaway`, `bot-roulette`, `bot-admin`, `bot-ticket`, `bot-welcome`

---

## Deploy Web Only (Vercel)

```bash
python deploy.py deploy web
# or: npm run deploy  (from apps/web/)
```

## Setup Steps (First Time)

### Step 1: Add a PostgreSQL Database on Railway

```bash
cd bot-bay/apps/bot-verification  # Any bot directory works
railway plugin add postgresql
```

This automatically sets `DATABASE_URL` as an environment variable in your Railway project. All bots share this database.

### Step 2: Configure Bot Environment Variables (Railway)

For each bot, set these in the Railway Dashboard → Settings → Environment Variables:

| Variable | Description |
|----------|-------------|
| `DISCORD_TOKEN` | Your bot's Discord token (one per bot) |
| `DATABASE_URL` | PostgreSQL URL (auto-set by Railway PG plugin) |
| `IPQUALITYSCORE_API_KEY` | (verification bot only) IPQualityScore API key |
| `PROXYCHECK_API_KEY` | (verification bot only) ProxyCheck.io API key |
| `VERIFIED_ROLE_ID` | (welcome bot only) Discord role ID for verified users |

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
| `DATABASE_URL` | PostgreSQL URL (link Vercel to same Railway DB) |

### Step 3: Deploy All

```bash
python deploy.py
```

## Project Structure

```
bot-bay/
├── apps/
│   ├── bot-verification/      # 🤖 Sentinel Verify → Railway
│   ├── bot-giveaway/          # 🎁 Bounty Drop → Railway
│   ├── bot-roulette/          # 🎰 Fortune Wheel → Railway
│   ├── bot-admin/             # ⚖️ Iron Gavel → Railway
│   ├── bot-ticket/            # 🎫 Deskline → Railway
│   ├── bot-welcome/           # 👋 Threshold → Railway
│   └── web/                   # 🌐 Dashboard → Vercel
├── packages/db/               # Shared SQLAlchemy models
├── railway.json               # Railway monorepo config (6 bots)
├── vercel.json                # Vercel config (web dashboard)
├── Dockerfile                 # Unified Docker build
├── deploy.py                  # Deploy script (Railway + Vercel)
├── deploy.js                  # Node.js wrapper
└── .env.example               # All env vars documented
```

## Notes

- Each bot runs as an independent Railway service with auto-restart on failure (`maxRestarts: 5`)
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
