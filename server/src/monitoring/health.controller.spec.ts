import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from './health.controller.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { RedisService } from '../redis/redis.service.js';

function build(prismaOk: boolean, redisOk: boolean) {
  const prisma = { $queryRaw: vi.fn(async () => (prismaOk ? [{ '?column?': 1 }] : Promise.reject(new Error('db down')))) };
  const redis = {
    raw: { ping: vi.fn(async () => (redisOk ? 'PONG' : Promise.reject(new Error('redis down')))) },
  };
  const controller = new HealthController(
    prisma as unknown as PrismaService,
    redis as unknown as RedisService,
  );
  return { controller, prisma, redis };
}

describe('HealthController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reports ok with per-dependency latency when both deps are up', async () => {
    const { controller } = build(true, true);
    const res = await controller.getHealth();
    expect(res.status).toBe('ok');
    expect(res.checks.postgres.status).toBe('up');
    expect(res.checks.redis.status).toBe('up');
    expect(typeof res.checks.postgres.latencyMs).toBe('number');
    expect(typeof res.uptimeSeconds).toBe('number');
  });

  it('throws 503 when the database is down but still reports redis as up', async () => {
    const { controller } = build(false, true);
    await expect(controller.getHealth()).rejects.toMatchObject(
      expect.any(ServiceUnavailableException),
    );
    try {
      await controller.getHealth();
    } catch (e) {
      const body = (e as ServiceUnavailableException).getResponse() as any;
      expect(body.status).toBe('degraded');
      expect(body.checks.postgres.status).toBe('down');
      expect(body.checks.redis.status).toBe('up');
    }
  });

  it('throws 503 when redis is down', async () => {
    const { controller } = build(true, false);
    await expect(controller.getHealth()).rejects.toMatchObject(
      expect.any(ServiceUnavailableException),
    );
  });
});
