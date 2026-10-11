import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import * as Sentry from '@sentry/node';

/**
 * Env-gated error monitoring (Phase 8, PRD §89).
 *
 * Inert unless SENTRY_DSN is set — every call is a safe no-op in local dev
 * and CI, so instrumentation can ship ahead of the Sentry account existing.
 * When a DSN is present, exceptions and messages are forwarded to Sentry.
 */
@Injectable()
export class MonitoringService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MonitoringService.name);
  private enabled = false;

  onModuleInit() {
    const dsn = process.env.SENTRY_DSN;
    if (!dsn) {
      this.logger.log('Sentry disabled (no SENTRY_DSN) — error monitoring is inert');
      return;
    }
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV ?? 'development',
      release: process.env.SENTRY_RELEASE,
      // Keep high-cardinality noise out of the beta pipeline; sampling off
      // by default so a stray DSN never floods the quota during testing.
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0),
    });
    this.enabled = true;
    this.logger.log('Sentry error monitoring enabled');
  }

  onModuleDestroy() {
    if (!this.enabled) return;
    // Flush so in-flight events are not dropped on shutdown.
    void Sentry.close(2000).catch(() => undefined);
  }

  get isEnabled(): boolean {
    return this.enabled;
  }

  captureException(error: unknown, context?: Record<string, unknown>): void {
    if (!this.enabled) return;
    Sentry.withScope((scope) => {
      if (context) scope.setExtras(context);
      Sentry.captureException(error);
    });
  }

  captureMessage(message: string, context?: Record<string, unknown>): void {
    if (!this.enabled) return;
    Sentry.withScope((scope) => {
      if (context) scope.setExtras(context);
      Sentry.captureMessage(message);
    });
  }

  /** Record an auth failure (PRD §89 — "Authentication failures"). */
  trackAuthFailure(reason: string): void {
    if (!this.enabled) return;
    Sentry.addBreadcrumb({ category: 'auth', level: 'warning', message: reason });
    Sentry.captureMessage(`auth_failure: ${reason}`, 'warning');
  }
}
