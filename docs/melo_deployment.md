# MELO — Deployment Guide

> Companion to `melo_launch_checklist.md`. The checklist says *what* must be true before launch; this says *how* to get the system running on a host.

## 1. Architecture

Two deployables plus three managed services:

| Piece | How it runs | Notes |
|---|---|---|
| **API** (NestJS) | `server/Dockerfile` — multi-stage, runs `prisma migrate deploy` then `node dist/main` | Enables `pg_trgm` idempotently on boot |
| **Web** (Next.js) | `next build` → `next start` (or the platform's Next.js handler) | Talks to the API via `NEXT_PUBLIC_API_URL` |
| **Postgres** | Managed (Neon / Supabase / RDS) | Must allow the `pg_trgm` extension |
| **Redis** | Managed (Upstash / ElastiCache) | OTP storage + caching; required, not optional |
| **S3-compatible storage** | Cloudflare R2 (or any S3-compatible) | Audio assets; presigned playback URLs |

Local dev stays on `docker compose up -d` (Postgres + Redis + Moto S3). The Postgres volume is pinned `external` so `down` never wipes the seeded catalogue.

## 2. Platform decision: Render (free tier first)

**Chosen stack — $0/month to start:** Render for both services, Cloudflare R2 for
storage. `render.yaml` at the repo root is a Render Blueprint: connect the GitHub
repo once and Render provisions everything in it.

Why Render over Railway (both accounts are GitHub-linked):

| | Render free | Railway |
|---|---|---|
| Compute | 750 instance-hours/month, services sleep after ~15 min idle | No free tier — trial credit expires, then **requires a paid plan** |
| Postgres | Free instance, but **expires ~30 days** after creation | Paid usage only |
| Redis/KV | Free Key Value instance (25 MB, no persistence — fine for OTP) | Paid usage only |
| Credit card | Not required | Required to keep running |

Railway is the better *paid* product (no cold starts), but Render is the only
one of the two that keeps running for free. Upgrade path when traffic demands
it: Render Starter ($7/mo per service, always-on) — the `plan:` field in
`render.yaml` is the only thing that changes.

Free-tier inventory for the whole launch:

| Piece | Service | Free limit | Caveat |
|---|---|---|---|
| API + web hosting | Render web services ×2 | 750 hrs/mo shared; sleep after ~15 min | First request after idle takes ~50 s (cold start) |
| Postgres | Render free DB (`melo-db`) | 0.5–1 GB | **Expires ~30 days** → migrate to **Neon free** (0.5 GB, no expiry); `pg_trgm` supported |
| Redis | Render Key Value (`melo-kv`) | 25 MB, no persistence | Fine — OTP codes are ephemeral by design |
| Audio storage | Cloudflare R2 | 10 GB, **zero egress fees** | Audio streams bypass Render entirely — egress never hits the 5 GB web bandwidth cap |
| Email OTP | Resend free | 3,000/month, 100/day | Sandbox sender until you verify your own domain |
| SMS OTP | Termii | Pay-per-unit, no free tier | Launch email-OTP-first; buy units + register sender ID when ready for phone OTP (Nigeria sender-ID registration takes days) |
| Error monitoring | Sentry Developer | 5,000 errors/month | Paste DSN to enable |
| Session replay | LogRocket | 1,000 sessions/month | Paste app ID to enable |

### Render deploy sequence (one-click)

1. Push this repo to GitHub (Blueprint reads `render.yaml` from the branch root).
2. Render dashboard → **New +** → **Blueprint** → connect the repo → **Apply**.
   Render reads `render.yaml` and creates `melo-api` (Docker), `melo-web`
   (Node), `melo-kv` (Key Value), and `melo-db` (Postgres), wiring
   `DATABASE_URL`/`REDIS_URL` automatically.
3. The deploy form prompts for every `sync: false` key (Groq, Termii, Resend,
   R2, Sentry, LogRocket). You can fill them later — the app degrades
   gracefully: AI search falls back to the rule parser, and OTP endpoints
   return a 503 that names the missing key.
4. Seed once: `melo-api` → **Shell** → `node prisma/seed.mjs` (idempotent).
5. Smoke-check per §5. The public URLs are deterministic from the service
   names: API `https://melo-api.onrender.com`, web `https://melo-web.onrender.com`.
   `CORS_ORIGINS` and `NEXT_PUBLIC_API_URL` are pre-wired to exactly these.

> ⚠️ **Free Postgres expires ~30 days after creation** (14-day grace, then
> deleted). Before day 25: create a **Neon** free project, run
> `npx prisma migrate deploy` against it with `DATABASE_URL` pointed at Neon,
> copy data (`pg_dump melo | psql $NEON_URL`), then update `DATABASE_URL` in
> the Render dashboard. Nothing else changes.

### Custom domain + TLS

`*.onrender.com` ships with TLS. A custom domain is a Render Dashboard step
(Domain → Add → DNS CNAME) and free on every plan; TLS is issued
automatically. Do it when the name is settled — then update `CORS_ORIGINS`
to match. The TWA/APK wrapper must be rebuilt if the domain changes
(`docs/melo_pwa_apk.md`).

## 3. Environment variables

Set these in the platform's **secret store**, never in the repo. `server/.env.example` and root `.env.example` list every key with safe defaults.

### API (server)

| Key | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | Managed Postgres connection string |
| `REDIS_URL` | yes | Managed Redis |
| `JWT_SECRET` | yes | Strong random value, unique per environment |
| `S3_ENDPOINT` / `S3_REGION` / `S3_BUCKET` / `S3_ACCESS_KEY` / `S3_SECRET_KEY` | yes | R2 or other S3-compatible |
| `CORS_ORIGINS` | **yes in production** | Comma-separated web origins, no trailing slash. **The API refuses to boot in production without it** (launch gate). e.g. `https://melo.app` |
| `TERMII_API_KEY` | for phone OTP | Termii SMS. Missing → `/auth/otp/request` returns 503 for phone in production |
| `TERMII_SENDER_ID` | recommended | Registered sender ID |
| `RESEND_API_KEY` + `EMAIL_FROM` | for email OTP | Resend. Missing → 503 for email in production |
| `GROQ_API_KEY` | optional | AI intent parsing; falls back to the rule parser |
| `SENTRY_DSN` | optional | Error monitoring; inert when empty |
| `SENTRY_TRACES_SAMPLE_RATE` | optional | `0` = off; raise for real traffic sampling |

### Web

| Key | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | yes | Full API base URL, no trailing slash — e.g. `https://api.melo.app/api/v1` |
| `NEXT_PUBLIC_LOGROCKET_APP_ID` | optional | Session replay; inert when empty |

## 4. Deploy sequence

1. Provision Postgres + Redis + R2; note the connection strings.
2. Deploy the API from `server/Dockerfile`. It runs `prisma migrate deploy` on start. Seed once against the production DB: `node prisma/seed.mjs` (idempotent — safe to re-run).
3. Set the API env vars above, including `CORS_ORIGINS` with the web origin.
4. Deploy the web app with `NEXT_PUBLIC_API_URL` pointing at the API.
5. Verify: `GET /api/v1/health` returns `ok`; an allowed browser origin gets CORS headers; a disallowed one does not.

## 5. Post-deploy smoke checks

- Health: `GET /api/v1/health` → `200 { status: "ok", ... }` (503 if Postgres/Redis degrade).
- Auth: request an OTP for a phone and an email; confirm delivery (or a 503 naming the missing key, if unconfigured).
- CORS: an allowed origin echoes back `Access-Control-Allow-Origin`; any other origin gets no such header.
- Playback: authorize a track; a licensed region gets a signed URL, an unlicensed one gets `no-stream`.
- Search: `afro beats` returns Afrobeats tracks; `burna` returns the artist plus their songs and albums.

## 6. What is deliberately NOT automated

These need a human decision or account, so they stay open in the checklist:

- Termii / Resend / Sentry / LogRocket account creation and keys (Render prompts for them at deploy time).
- Cloudflare account + R2 bucket and API credentials.
- Optional custom domain purchase + DNS.
- Privacy review (Nigerian + international obligations) and pricing validation.

## 7. Related

- `docs/melo_pwa_apk.md` — PWA installability and the Android APK (TWA) build.
- `docs/melo_launch_checklist.md` — the full pre-launch gate list.
