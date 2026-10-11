import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Sentry's ESM namespace isn't spy-able, so replace the module wholesale.
const { initMock, captureExceptionMock, captureMessageMock, closeMock, withScopeMock, addBreadcrumbMock } =
  vi.hoisted(() => ({
    initMock: vi.fn(),
    captureExceptionMock: vi.fn(() => 'exc-id'),
    captureMessageMock: vi.fn(() => 'msg-id'),
    closeMock: vi.fn(async () => true),
    withScopeMock: vi.fn((cb: (scope: { setExtras: (e: unknown) => void }) => unknown) =>
      cb({ setExtras: vi.fn() }),
    ),
    addBreadcrumbMock: vi.fn(),
  }));

vi.mock('@sentry/node', () => ({
  init: initMock,
  captureException: captureExceptionMock,
  captureMessage: captureMessageMock,
  close: closeMock,
  withScope: withScopeMock,
  addBreadcrumb: addBreadcrumbMock,
}));

import { MonitoringService } from './monitoring.service.js';

describe('MonitoringService (env-gated)', () => {
  const realDsn = process.env.SENTRY_DSN;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (realDsn === undefined) delete process.env.SENTRY_DSN;
    else process.env.SENTRY_DSN = realDsn;
  });

  it('stays inert and never calls Sentry when no DSN is configured', () => {
    delete process.env.SENTRY_DSN;
    const svc = new MonitoringService();
    svc.onModuleInit();
    expect(svc.isEnabled).toBe(false);
    expect(initMock).not.toHaveBeenCalled();

    svc.captureException(new Error('boom'));
    svc.captureMessage('hello');
    svc.trackAuthFailure('bad code');
    expect(captureExceptionMock).not.toHaveBeenCalled();
    expect(captureMessageMock).not.toHaveBeenCalled();
    expect(addBreadcrumbMock).not.toHaveBeenCalled();
  });

  it('initializes Sentry and forwards errors when a DSN is present', () => {
    process.env.SENTRY_DSN = 'https://key@example.com/1';
    const svc = new MonitoringService();
    svc.onModuleInit();
    expect(svc.isEnabled).toBe(true);
    expect(initMock).toHaveBeenCalledWith(
      expect.objectContaining({ dsn: 'https://key@example.com/1' }),
    );

    svc.captureException(new Error('boom'), { path: '/x' });
    expect(captureExceptionMock).toHaveBeenCalledTimes(1);

    svc.captureMessage('hello');
    expect(captureMessageMock).toHaveBeenCalledTimes(1);

    svc.trackAuthFailure('expired');
    expect(addBreadcrumbMock).toHaveBeenCalledTimes(1);
    // trackAuthFailure also emits a captureMessage.
    expect(captureMessageMock).toHaveBeenCalledTimes(2);
  });

  it('flushes Sentry on shutdown only when enabled', () => {
    delete process.env.SENTRY_DSN;
    const disabled = new MonitoringService();
    disabled.onModuleInit();
    disabled.onModuleDestroy();
    expect(closeMock).not.toHaveBeenCalled();

    process.env.SENTRY_DSN = 'https://key@example.com/1';
    const enabled = new MonitoringService();
    enabled.onModuleInit();
    enabled.onModuleDestroy();
    expect(closeMock).toHaveBeenCalled();
  });
});
