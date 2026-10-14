# MELO — Stack v2 + Christian-first pivot (2026-10-14)

Addendum to `MELO — MASTER PRD v1.md` (v1 stays the product source of truth;
this file records the tech-stack migration and scope additions).

## 1. Target stack (free-tier first)

| Domain | Choice | Status |
|---|---|---|
| Frontend | Next.js PWA, **Cloudflare Pages** target (parallel build; Render stays live until cutover) | scaffolded (`wrangler.toml`) |
| Backend + DB | **Neon Postgres primary** (system of record, pg_trgm live) + NestJS API | live, unchanged |
| Realtime | **Convex** reserved for ephemeral sync only (presence, live likes) — NOT a second primary DB | placeholder (`convex/schema.note.ts`) |
| Auth | **Better Auth** client now, server cutover later; live OTP (Mailofly → Resend → Termii) untouched | client stub + Mailofly wired |
| Email | **Mailofly primary** (`MAILOFLY_API_KEY` + `MAILOFLY_FROM`), **Resend fallback** (same shape) | live in `MailService` |
| SMS | Termii (pay-per-unit; email-first launch) | unchanged |
| Analytics | **PostHog** (env-gated, inert without key) | client wired |
| Storage | **Cloudflare R2** (presigned GET playback + presigned PUT uploads) | live |
| Embeddings/recs | **Neon pgvector later** — no Supabase; MVP is mood/tag heuristics (skips + likes) | planned |
| Mobile | **Expo** app in `apps/mobile` sharing the same API; PWA/TWA stay shipped surface | plan only |
| AI music | Provider-gated stub (`AI_MUSIC_PROVIDER` + `AI_MUSIC_API_KEY`); HF DiffRhythm/Flow recommended free tier | 501 until configured |

Supabase is explicitly OUT (would duplicate Neon). Stripe from the
reference app is OUT for MVP (no payments until pricing validated).

## 2. Christian-first catalogue

- Launch moods: **worship, praise, prayer, bible-study** (in `/upload` + vibe filters).
- Sources, in order: (a) user uploads with rights declarations → admin
  approval; (b) AI-generated worship placeholders, always labelled
  `(AI-generated)`, same approval queue; (c) licensed catalogue later.
- Rights-before-scale stands: pending tracks/rights/assets can never play
  (rights gate requires active track + active right + ready/demo asset).

## 3. User uploads (ported from reference-app pattern, adapted)

Reference: Beatboxx-style upload modal (file + cover → storage → songs
table → liked library). MELO adaptation: presigned R2 PUT → `POST
/uploads/complete` mints `pending_review` track/version/asset/right →
`/admin` approve flips all three to active. Free uploads for MVP (no
one-song paywall like the reference).

## 4. Admin section

`/admin` (web) + `/admin/*` (API), gated by `ADMIN_EMAILS`. Queue lists
pending tracks with artist/album/rights; approve/reject flips statuses.
Admins must sign in with email OTP (JWT email claim).

## 5. Migration safety

- Nothing was deleted. NestJS/Prisma/Neon/OTP/R2 stay live on Render.
- Cutover order: (1) Mailofly key → verify OTP; (2) `/upload` + `/admin`
  live test with a real MP3; (3) PostHog key → verify events; (4) Pages
  preview smoke (auth + playback); (5) DNS switch; (6) Better Auth server
  cutover; (7) Convex realtime; (8) Expo. Each step independently
  revertible by env var.

## 6. Keys still needed from the operator

`MAILOFLY_API_KEY`, `MAILOFLY_FROM` (or verified domain), `ADMIN_EMAILS`,
`NEXT_PUBLIC_POSTHOG_KEY` (+ optional HOST), `AI_MUSIC_PROVIDER` +
`AI_MUSIC_API_KEY` (HF token recommended), `CONVEX_URL` (only when
realtime starts).

## 7. Cloudflare Workers preview (2026-10-15) — LIVE

- Worker `melo-find-your-vibe` via `@opennextjs/cloudflare` (Pages
  `next-on-pages` path abandoned: capped at Next 15 + broken on Windows).
  Preview: https://melo.melo-find-your-vibe.workers.dev (worker renamed
  from the double-barrelled URL; old worker deleted). `CORS_ORIGINS`
  carries the Render web + this preview origin.
- `NEXT_PUBLIC_API_URL` baked at build time → live Render API; `CORS_ORIGINS`
  on `melo-api` includes the preview origin (verified echo).
- Smoke: homepage 200 + title, manifest valid, OTP request from preview
  origin → 201 + ACAO echo. R2 incremental cache disabled (deploy-time
  population times out from here; pages are client-rendered anyway).
- Render web stays the canonical URL until the short-name cutover; the
  preview is the switch target. Traffic switch = point users at the
  Workers URL (or custom domain later).
