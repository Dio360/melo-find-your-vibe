# MELO — Find Your Vibe

African-first music discovery + streaming. Christian-first catalogue
(worship / praise / prayer / bible-study), user uploads with admin
approval, AI-assisted discovery.

Live: https://melo-web-dbze.onrender.com/ (web) · API
`https://melo-api-72jn.onrender.com/api/v1`

## Stack v2 (free-tier first)

- Web: Next.js PWA → Cloudflare Pages target (`wrangler.toml`); Render live until cutover
- API: NestJS modular monolith (`server/`) → Render Docker; **Neon Postgres primary** (pg_trgm search live)
- Auth: email + password (Beatboxx-style modal; OTP retired from UI); Better Auth client in `src/lib/better-auth.ts`
- Storage: Cloudflare R2 (presigned playback + presigned uploads under `uploads/`)
- Analytics: PostHog (env-gated) + LogRocket; Sentry server-side
- Realtime (later): Convex for ephemeral sync only — Neon stays source of truth
- Mobile (later): Expo in `apps/mobile` sharing the same API
- AI music (later): provider-gated `POST /ai/generate` (501 until keys); HF DiffRhythm/Flow recommended free tier

## Key routes

- `/` home · `/upload` user song/album upload (pending review) · `/admin` approval queue (`ADMIN_EMAILS`)
- API: `/auth/otp/*` · `/uploads/presign|complete` · `/admin/pending|tracks/:id/approve|reject` · `/playback/authorize` · `/ai/generate` (501 until configured)

## Env

Web: copy `.env.example` → `.env.local` (`NEXT_PUBLIC_API_URL`,
`NEXT_PUBLIC_POSTHOG_KEY/HOST`). Server: copy `server/.env.example` →
`server/.env` (`DATABASE_URL`, `MAILOFLY_API_KEY/FROM`, `ADMIN_EMAILS`,
S3/R2 keys, `AI_MUSIC_*`). Secrets live in Render env + gitignored files,
never in the repo.

Docs: `docs/MELO — MASTER PRD v1.md` (product) ·
`docs/MELO-PRD-v2-addendum.md` (stack v2 + migration) ·
`docs/melo_deployment.md` (as-built live record).
