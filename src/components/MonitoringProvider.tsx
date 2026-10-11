'use client';

import { useEffect } from 'react';
import LogRocket from 'logrocket';

/**
 * Env-gated session replay (Phase 8, PRD §89).
 *
 * Inert unless NEXT_PUBLIC_LOGROCKET_APP_ID is set — a no-op in local dev
 * and CI so instrumentation can ship before the LogRocket account exists.
 * Mounted once, high in the tree, to capture the whole client session.
 */
export function MonitoringProvider({ children }: { children: React.ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_LOGROCKET_APP_ID;

  useEffect(() => {
    if (!appId) return;
    try {
      LogRocket.init(appId, {
        // Keep auth material out of recordings: mask all inputs, and only
        // record console at warn+ so debug noise never lands in a replay.
        dom: { inputSanitizer: true },
        console: { isEnabled: { log: false, info: false, debug: false, warn: true, error: true } },
      });
    } catch {
      // Monitoring must never break the app.
    }
  }, [appId]);

  return <>{children}</>;
}
