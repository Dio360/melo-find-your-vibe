# MELO mobile (stack v2) — React Native / Expo plan

Status: scaffolded, not started. Web (PWA + TWA APK) stays the shipped
mobile surface until this app reaches auth + playback parity.

Decision:
- `apps/mobile` (Expo, TypeScript) sharing the API client contract in
  `src/lib/api.ts` (port to `apps/mobile/lib/api.ts`, same paths).
- Same backends: NestJS API on Render → Neon, R2 presigned URLs, Mailofly/
  Resend OTP, Better Auth session when cut over.
- No new database, no Supabase: Expo talks to the same `/api/v1`.

Init when ready (from repo root):
  npx create-expo-app apps/mobile --template blank-typescript
  # then port: api client, OTP screens (reuse AuthModal flow), player
  # (expo-av), upload screen (reuse /uploads presign), admin read-only.

Free-tier notes: Expo Go for dev (free), EAS Build free tier for test
builds; store submission later. Do not start until web /upload + /admin
are verified live.
