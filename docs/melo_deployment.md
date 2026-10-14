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
| Postgres | **Neon free** (`melo-db`, project `snowy-credit-62106713`) | 0.5 GB, ~190 compute-hrs/mo | **Migrated from Render free DB on 2026-10-12** (that DB would have expired 2026-11-10); compute autosuspends when idle and wakes on connect; `pg_trgm` verified |
| Redis | Render Key Value (`melo-kv`) | 25 MB, no persistence | Fine — OTP codes are ephemeral by design |
| Audio storage | Cloudflare R2 | 10 GB, **zero egress fees** | Audio streams bypass Render entirely — egress never hits the 5 GB web bandwidth cap |
| Email OTP | Resend free | 3,000/month, 100/day | Sandbox sender until you verify your own domain |
| SMS OTP | Termii | Pay-per-unit, no free tier | Launch email-OTP-first; buy units + register sender ID when ready for phone OTP (Nigeria sender-ID registration takes days) |
| Error monitoring | Sentry Developer | 5,000 errors/month | Paste DSN to enable |
| Session replay | LogRocket | 1,000 sessions/month | Paste app ID to enable |

### What is actually provisioned (as of 2026-10-11, live)

All infra was created via the Render REST API (the Blueprints API is
early-access gated). `render.yaml` stays the env-var source of truth and a
ready blueprint for a *fresh* workspace — do **not** apply it to this
workspace, the names now collide with the live services.

| Resource | ID | URL / endpoint |
|---|---|---|
| `melo-api` (web service, Docker, oregon, free) | `srv-db5vtc5ckfvc73bkq0fg` | **https://melo-api-72jn.onrender.com** |
| `melo-web` (web service, Node, oregon, free) | `srv-db5vrrks728c7397or4g` | **https://melo-web-dbze.onrender.com** |
| `melo-kv` (Key Value, free) | `red-db5vmf4s728c7397719g` | internal only: `redis://red-db5vmf4s728c7397719g:6379` |
| `melo-db` (Postgres 17, free) | `dpg-db5vn6vavr4c73a8cskg-a` | internal only; **expires 2026-11-10** |

> ⚠️ **Render no longer grants bare `*.onrender.com` names** — new services get
> a random suffix (`melo-api-72jn`, `melo-web-dbze`). `CORS_ORIGINS` and
> `NEXT_PUBLIC_API_URL` are wired to these **suffixed** URLs. If a service is
> ever recreated, update both env vars to the new URL and rebuild the APK
> (the TWA pins the web host).

> ⚠️ **Instance-hours math:** the 750 free instance-hours/month are shared by
> *both* web services, so continuous uptime for the pair is impossible
> (2 × ~730 h needed). This is fine in practice: sleeping consumes no hours,
> so light/demo traffic stays under budget. Heavy traffic → upgrade one
> service (Render Starter, always-on) or move the web app elsewhere.

Seed data loaded (7 vibes, 6 artists, 6 albums, 6 tracks). Re-seed any time:
either dashboard **Shell** → `node prisma/seed.mjs`, or from a machine whose
IP you temporarily allowlist (empty `ipAllowList` = internal-only access;
external connections require `?sslmode=require` in the URL).

### Managing services after launch

- Dashboard: https://dashboard.render.com (service IDs above deep-link there).
- API: same operations used for provisioning — `PATCH /v1/services/{id}`,
  `PUT /v1/services/{id}/env-vars`, `POST /v1/services/{id}/deploys`,
  `GET /v1/services/{id}/deploys` for status. Secrets (`GROQ_API_KEY`,
  `JWT_SECRET`…) live in the env-vars store, never in the repo.
- Pushes to `main` auto-deploy both services (`autoDeploy: yes`).

> ✅ **Done (2026-10-12): migrated off Render Postgres to Neon free** before
> the Render DB's expiry. As-built record:
>
> - **Neon**: project `melo-db` (`snowy-credit-62106713`), Postgres 17, branch
>   `production`, org `org-young-night-06025796`. Direct endpoint
>   `ep-solitary-rain-b55a4k8y.c-7.us-east-2.aws.neon.tech` (local `.env.local`
>   holds both pooled + unpooled URLs, gitignored).
> - **Copy**: `pg_dump -Fc --no-owner --no-privileges` from Render (external
>   URL) via a `postgres:17-alpine` container, `pg_restore` into Neon. Verified
>   identical: all 17 tables (6 albums / 6 artists / 6 tracks / 7 vibes /
>   6 audio assets / 6 content rights / 6 track versions), `pg_trgm` extension,
>   4 finished `_prisma_migrations` rows.
> - **Cutover**: `DATABASE_URL` on `melo-api` → Neon **direct** (unpooled)
>   endpoint with `?sslmode=require`. Direct, not `-pooler`, because the
>   container runs `prisma migrate deploy` on boot — DDL must not go through
>   PgBouncer. One service instance → direct endpoint is correct anyway.
> - **Access dance for the dump**: Render blocks external connections unless
>   the source IP is allowlisted — `PATCH /v1/postgres/{id}` with
>   `ipAllowList: [{cidrBlock, description}]` (temporarily added the operator
>   IP, dumped, restored to `[]` = internal-only).
> - **Render DB now**: inert backup. It sleeps and expires **2026-11-10** on
>   its own, or delete it in the dashboard once comfortable — nothing points
>   at it anymore.

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

- ~~Termii / Resend account creation and keys~~ — **done 2026-10-12** (keys in the Render env store; email OTP verified live).
- ~~Cloudflare account + R2 credentials~~ — **done 2026-10-14**: R2 enabled,
  bucket `melomusic` live with all 18 demo assets (6 tracks × 64/128/320k,
  11.0 MB matching the `AudioAsset` rows); `S3_*` wired on `melo-api`;
  `GET /playback/authorize` returns signed R2 URLs verified to stream
  (HTTP 206, audio/mpeg). `MAILOFLY_API_KEY/FROM/ACCOUNT_KEY` set (Work
  Gmail identity `acc_68a8`); live OTP confirmed delivered via Mailofly
  (visible in their `/emails` log). `ADMIN_EMAILS=mcigez@gmail.com`;
  `/admin/pending` returns 200/[] for admin, 403 otherwise.
- Sentry / LogRocket account creation and keys (paste into the services' env vars in the Render dashboard when the accounts exist).
- Optional custom domain purchase + DNS.
- Privacy review (Nigerian + international obligations) and pricing validation.

## 7. Related

- `docs/melo_pwa_apk.md` — PWA installability and the Android APK (TWA) build.
- `docs/melo_launch_checklist.md` — the full pre-launch gate list.
