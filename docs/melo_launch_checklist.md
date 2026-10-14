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
- [x] **OTP delivery is wired** (`otp-delivery.service.ts`): phone → Termii SMS, email → Resend. Delivery runs *before* the code is stored, so a provider failure stores nothing and consumes no cooldown (covered by tests).
- [x] Production fails loudly: a missing `TERMII_API_KEY` / `RESEND_API_KEY`+`EMAIL_FROM` makes `/auth/otp/request` return 503 for that channel instead of silently accepting undeliverable logins. Dev keeps the devCode fallback (confirmed live).

- [x] **Resend + Termii credentials live (2026-10-12).** `RESEND_API_KEY` + `EMAIL_FROM="MELO <onboarding@resend.dev>"` (Resend's test sender — swap to a verified domain later) + `TERMII_API_KEY` set on `melo-api`. Email OTP verified end-to-end against the live API: `POST /auth/otp/request` for a real address returns `{ok:true, expiresIn:300}` and the code lands in the inbox. Termii key validated against the send route (auth accepted; a non-dialable probe recipient returns a validation error, no SMS sent) — a real SMS has not been sent yet (pay-per-unit; no phone number on hand). **Bug found + fixed on first live send:** the service never attached the Resend bearer header (spec's mocked fetch hid it) — fixed in `3f75140` with a regression test asserting the header and that the key never leaks into the body.

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

**Deploy path (executed):** services were provisioned via the Render REST API
(the Blueprints API is early-access gated). `render.yaml` remains the
env-var source of truth and a blueprint for a fresh workspace — do not apply
it to the live workspace (name collisions). Live services + IDs:
`melo_deployment.md` §2.

## 7. Container & deploy readiness — READY

- [x] `server/Dockerfile` multi-stage build (build → slim runtime), runs `prisma migrate deploy` on start, enables trgm idempotently.
- [x] `server/.dockerignore` excludes `.env`, `node_modules`, `dist`, secrets.
- [x] `docker-compose.yml` pins the Postgres volume as `external` so `up/down` never wipes the seeded catalogue.
- [x] **LIVE on Render free tier** (2026-10-11) — API `https://melo-api-72jn.onrender.com` (Docker), web `https://melo-web-dbze.onrender.com` (Node), plus Key Value + Postgres. Railway rejected earlier: no free tier. Free-tier caveats (shared 750 instance-hrs, sleeping services, cold starts) are in `melo_deployment.md` §2. Postgres **migrated to Neon free on 2026-10-12** (the Render DB it replaced expires 2026-11-10).

## 8. Open items requiring a decision/account (cannot be completed from code alone)

- [x] Real SMS/email OTP provider **accounts + keys** (Termii / Resend) — set and verified live 2026-10-12 (see §2). Email OTP is fully working end-to-end; SMS is wired and the key is accepted, pending a real phone number to test against (launch email-OTP-first: Resend free 3,000/month; Termii is pay-per-unit).
- [ ] Sentry project + `SENTRY_DSN`.
- [ ] LogRocket project + `NEXT_PUBLIC_LOGROCKET_APP_ID`.
- [ ] Metrics backend for infra/playback/business metrics (§5 open list).
- [x] **Hosting: Render free tier — PROVISIONED AND LIVE** (2026-10-11, via Render API; see `melo_deployment.md` §2 for service IDs/URLs). Catalogue seeded (7 vibes / 6 artists / 6 albums / 6 tracks). **Audio storage live (2026-10-14):** R2 enabled, bucket `melomusic` holds all
18 demo assets (6 tracks × 3 bitrates, 11.0 MB); `S3_*` credentials set;
`/playback/authorize` returns signed URLs verified to stream real bytes
(HTTP 206 `audio/mpeg`). Demo tones are clearly placeholders until
licensed files arrive via `/upload` + admin approval. **Postgres migrated to Neon free (2026-10-12)** — full `pg_dump`/`pg_restore` copy, `DATABASE_URL` flipped, search verified live; no expiry clock anymore.
- [x] **CORS allowlist** — env-driven via `CORS_ORIGINS` (`config/cors.ts`). Dev defaults to localhost:3000; **production refuses to boot** without an explicit allowlist. Allowed-origin echo + disallowed-origin block both confirmed live. Live value: `https://melo-web-dbze.onrender.com` (Render's suffixed service URL), confirmed echoing on the live API.
- [x] **PWA** — manifest, icons, service worker, offline page, install UI shipped and verified (§10).
- [ ] Custom domain + TLS (optional; `*.onrender.com` ships with TLS — revisit after the name is settled; rebuild the TWA/APK if the host changes).
- [ ] Privacy review (PRD §Nigerian/international obligations) signed off by a professional before public launch.
- [ ] Pricing validated via user research (PRD §launch strategy).

## 9. Search relevance (PRD §15) — WIRED

- [x] Synonym / alternative-spelling expansion (`search-synonyms.ts`): afrobeats↔afro beats, amapiano, highlife, hip hop, r&b, naija↔nigeria, alté↔alte; diacritics + `&` + hyphen normalization.
- [x] Artist aliases resolve to the canonical name (wizzy/starboy → Wizkid, obo → Davido).
- [x] Rows match on ANY variant, but score against the user's ORIGINAL words — a synonym widens the net without outranking a direct hit (dedup by best score).
- [x] Track search matches artist name, genre, and region; album search matches artist name — so "burna" returns artist + songs + albums (the PRD's own worked example, confirmed live).
- [ ] Synonym/alias list is a curated seed — extend from real search analytics before leaning on it (PRD keeps the taxonomy editable).

## 10. PWA & Android APK — VERIFIED (both live)

- [x] Web manifest (`src/app/manifest.ts`) — standalone display, 192/512/maskable icons; served at `/manifest.webmanifest` (verified live).
- [x] App icons generated from one SVG source (`scripts/generate-icons.mjs`, sharp) — brand-consistent set incl. iOS apple-icon + favicon.
- [x] Service worker (`public/sw.js`) — caches hashed build assets only; pages network-first with offline fallback; API/auth/playback traffic is never cached. Registered in production only.
- [x] `sw.js` served with `Cache-Control: no-cache` so updates reach installed clients.
- [x] Install UI (`PwaRegistrar.tsx`) — install chip on Chromium, Share→Add-to-Home-Screen hint on iOS; dismissible; hidden when standalone.
- [x] Offline fallback page (`public/offline.html`).
- [x] Digital Asset Links served at `/.well-known/assetlinks.json` (keystore fingerprint embedded).
- [x] APK toolchain prepared: JDK 17 + Bubblewrap CLI, signing keystore (`android/melo-twa.keystore`), `twa-manifest.json` (package `app.melo.web`), full runbook (`android/README.md`).
- [x] **APK built against the live site** (2026-10-11): `android/app-release-signed.apk` (0.92 MB, package `app.melo.web`, minSdk 24 / targetSdk 36) + `app-release-bundle.aab` for Play. Signature SHA-256 matches the live `/.well-known/assetlinks.json` → full-screen TWA. Gotchas fixed en route (all documented in `android/README.md`): minSdk 23→24 (androidbrowserhelper 2.7.4), missing `splashScreenFadeOutDuration` field, space-free JDK path, build-tools 36.1.0.
- [ ] Decide: sideload the APK directly vs. Google Play (AAB + $25 Play Console + store review).
