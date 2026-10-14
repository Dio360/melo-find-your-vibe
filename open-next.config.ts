// default open-next.config.ts file created by @opennextjs/cloudflare
import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// NOTE (stack v2): R2 incremental cache disabled — the deploy-time cache
// population to R2 times out from this network, and MELO pages are
// client-rendered/dynamic anyway (ISR cache adds nothing). Re-enable
// r2IncrementalCache once deploys run from CI with clean R2 access.
export default defineCloudflareConfig({});
