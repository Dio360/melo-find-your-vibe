# MELO — Production Launch Checklist (Phase 8)

> Status legend: **[x]** verified in this pass · **[ ]** open, needs an account/config/decision before public launch.
> Every item marked verified was checked against the running system, not assumed.

## 1. Secrets & config hygiene — VERIFIED

- [x] `server/.env` is gitignored (`git check-ignore` passes).
- [x] Only `.env.example` / `server/.env.example` templates are tracked — no live secrets committed.
- [x] Groq API key (`gsk_…`) is absent from every tracked file (`git grep` clean). Lives only in gitignored `server/.env`.
- [x] `JWT_SECRET` is a placeholder in `.env.example`; must be set to a strong random value per environment.
- [x] `.env.example` and root `.env.example` document every required key with safe defaults.

**Before launch:** set real `JWT_SECRET`, `DATABASE_URL`, `REDIS_URL`, `S3_*` (Cloudflare R2), and `GROQ_API_KEY` in the hosting platform's secret store — never in the repo.

## 2. Auth & OTP safety — VERIFIED

- [x] Dev OTP code (`devCode`) is returned **only** when `NODE_ENV !== 'production'` (`auth.service.ts`). Production responses never include it.
- [x] OTP max-attempts lockout and cooldown are enforced (covered by tests).
- [x] One-time-use codes are consumed on successful verify (covered by tests).
- [x] JWT guard rejects missing/invalid bearer tokens (401s confirmed live).

**Before launch:** wire a real SMS/email provider (Termii / Africa's Talking) to replace the dev-code path — the TODO is in `auth.service.ts`.

## 3. Rights-before-scale (PRD §4.9) — VERIFIED

- [x] Pre-playback authorization denies inactive/unlicensed/wrong-territory/expired-window tracks (12 rights tests).
- [x] Playback returns `no-stream` when no ready/demo asset exists; never invents a URL.
- [x] Signed playback URLs expire per `PLAYBACK_URL_TTL_SECONDS`.
- [x] AI playlist generation rights-gates every candidate and never invents a track (grounding tests).
- [x] LLM output is sanitized to canonical vocab + live catalogue artists; any failure falls back to the rule parser.

## 4. AI never invents catalogue (PRD §4.8) — VERIFIED

- [x] Rule parser resolves artist references strictly against live catalogue rows.
- [x] Groq parser strips hallucinated moods/genres/regions/artists/energy; aliases canonicalized; count clamped 1–30.
- [x] Generator candidates come only from `Track` rows; fallback playlists are still real, licensed tracks.

## 5. Observability (PRD §89) — WIRED (env-gated)

- [x] `GET /api/v1/health` live — reports `postgres` + `redis` status and latency; returns 503 when degraded.
- [x] Global exception filter normalizes unexpected errors to 500 JSON and reports 5xx to monitoring (4xx suppressed to avoid noise).
- [x] Sentry error monitoring (`@sentry/node`) initializes only when `SENTRY_DSN` is set — inert in dev/CI.
- [x] LogRocket session replay initializes only when `NEXT_PUBLIC_LOGROCKET_APP_ID` is set; inputs masked.
- [x] Monitoring has direct test coverage (env-gating, health probe, filter reporting semantics).

**Before launch:** create the Sentry + LogRocket projects, drop DSNs into env, set `SENTRY_TRACES_SAMPLE_RATE` above 0 for real traffic sampling.

**Still open (PRD §89 buckets not yet instrumented):** infrastructure CPU/memory/CDN/storage metrics, playback-specific metrics (startup time, buffering, track-availability failures), and business metrics (DAU, listening sessions, discovery success, AI usage, conversion). These need a metrics backend (e.g. Prometheus/Grafana or the hosting platform's metrics) — see §8.

## 6. CI/CD release gate — WIRED

- [x] `.github/workflows/ci.yml` runs on push to `main` and on PRs.
- [x] Web job: `npm ci` → lint → `tsc --noEmit` → `next build` (all verified green locally).
- [x] Server job: `npm ci` → `prisma generate` → oxlint → `tsc --noEmit` → `vitest` (75 tests, all green locally).
- [x] Concurrency cancels superseded runs on the same ref.

**Before launch:** add a deploy workflow (the server `Dockerfile` is production-ready: `prisma migrate deploy` + `node dist/main`). Choose a platform (Railway / Render / Fly) and wire the secrets from §1.

## 7. Container & deploy readiness — READY

- [x] `server/Dockerfile` multi-stage build (build → slim runtime), runs `prisma migrate deploy` on start, enables trgm idempotently.
- [x] `server/.dockerignore` excludes `.env`, `node_modules`, `dist`, secrets.
- [x] `docker-compose.yml` pins the Postgres volume as `external` so `up/down` never wipes the seeded catalogue.

## 8. Open items requiring a decision/account (cannot be completed from code alone)

- [ ] Real SMS/email OTP provider (replaces dev-code path).
- [ ] Sentry project + `SENTRY_DSN`.
- [ ] LogRocket project + `NEXT_PUBLIC_LOGROCKET_APP_ID`.
- [ ] Metrics backend for infra/playback/business metrics (§5 open list).
- [ ] Production Postgres + Redis + R2 provisioning and connection strings.
- [ ] **CORS allowlist** — `app.enableCors()` in `server/src/main.ts` is currently wide open (any origin). Restrict to the deployed web origin before public launch.
- [ ] Custom domain + TLS (handled by chosen platform).
- [ ] Privacy review (PRD §Nigerian/international obligations) signed off by a professional before public launch.
- [ ] Pricing validated via user research (PRD §launch strategy).
