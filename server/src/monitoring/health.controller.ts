import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { RedisService } from '../redis/redis.service.js';
import { Public } from '../modules/auth/public.decorator.js';

interface HealthCheck {
  status: 'up' | 'down';
  latencyMs: number;
}

/**
 * Liveness/readiness probe (Phase 8).
 * Reports dependency health without leaking internals. Used by uptime
 * monitoring and by the deployment platform's health check.
 */
@Public()
@Controller('health')
export class HealthController {
  private readonly startedAt = Date.now();

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get()
  async getHealth() {
    const checks: Record<string, HealthCheck> = {};

    checks.postgres = await this.probe(async () => {
      await this.prisma.$queryRaw`SELECT 1`;
    });

    checks.redis = await this.probe(async () => {
      const pong = await this.redis.raw.ping();
      if (String(pong) !== 'PONG') throw new Error(`unexpected redis reply: ${String(pong)}`);
    });

    const ok = Object.values(checks).every((c) => c.status === 'up');
    const body = {
      status: ok ? 'ok' : 'degraded',
      uptimeSeconds: Math.round((Date.now() - this.startedAt) / 1000),
      timestamp: new Date().toISOString(),
      checks,
    };

    if (!ok) throw new ServiceUnavailableException(body);
    return body;
  }

  private async probe(fn: () => Promise<void>): Promise<HealthCheck> {
    const start = Date.now();
    try {
      await fn();
      return { status: 'up', latencyMs: Date.now() - start };
    } catch {
      return { status: 'down', latencyMs: Date.now() - start };
    }
  }
}
