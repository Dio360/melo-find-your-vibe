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

## 2. Recommended platforms

Nothing here is committed to — pick per comfort and budget:

- **Railway** or **Fly.io** — both run the API Dockerfile as-is; good fit for the NestJS service.
- **Render** — web service from `server/Dockerfile`, plus managed Postgres/Redis.
- **Vercel** — simplest for the Next.js web app; the API still needs a container host.
- A **VPS** (Hetzner / DigitalOcean) with Docker Compose works too if you'd rather keep everything on one box.

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

- Hosting platform choice and custom domain + TLS.
- Termii / Resend / Sentry / LogRocket account creation and keys.
- Privacy review (Nigerian + international obligations) and pricing validation.
