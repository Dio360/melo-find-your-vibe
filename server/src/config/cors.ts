/**
 * CORS allowlist resolution (launch gate).
 *
 * - CORS_ORIGINS: comma-separated allowed web origins, e.g.
 *   "https://melo.app,https://www.melo.app" (no trailing slash, no path).
 * - Outside production it defaults to the local Next.js dev server.
 * - In production an explicit allowlist is REQUIRED: the API refuses to boot
 *   rather than serving every origin (launch checklist §8).
 */

const DEV_ORIGINS = ['http://localhost:3000', 'http://127.0.0.1:3000'];
const ORIGIN_PATTERN = /^https?:\/\/[^/\s]+$/;

export function resolveCorsOrigins(env: NodeJS.ProcessEnv = process.env): string[] {
  const raw = (env.CORS_ORIGINS ?? '').trim();
  if (!raw) {
    if ((env.NODE_ENV ?? 'development') === 'production') {
      throw new Error(
        'CORS_ORIGINS is required in production — set it to the deployed web origin(s), ' +
          'comma-separated, e.g. "https://melo.app".',
      );
    }
    return [...DEV_ORIGINS];
  }

  const origins = raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (origins.length === 0) {
    throw new Error('CORS_ORIGINS resolved to an empty allowlist.');
  }
  for (const origin of origins) {
    if (!ORIGIN_PATTERN.test(origin)) {
      throw new Error(
        `CORS_ORIGINS entry is not a valid origin (scheme + host only, no path): "${origin}"`,
      );
    }
  }
  return [...new Set(origins)];
}
