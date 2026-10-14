// PostHog analytics (stack v2). Inert when NEXT_PUBLIC_POSTHOG_KEY is empty.
// Respects the existing data-saver ethos: no tracking without consent UI;
// callers should gate identify/capture behind the user's opt-in.
import posthog from 'posthog-js';

let started = false;

export function initPostHog(): void {
  if (typeof window === 'undefined' || started) return;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY ?? '';
  if (!key) return;
  started = true;
  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
    capture_pageview: false,
    persistence: 'localStorage',
  });
}

export { posthog };
