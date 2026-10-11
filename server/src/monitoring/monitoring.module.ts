import { Global, Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { PrismaModule } from '../prisma/prisma.module.js';
import { RedisModule } from '../redis/redis.module.js';
import { MonitoringService } from './monitoring.service.js';
import { HealthController } from './health.controller.js';
import { GlobalExceptionFilter } from './exception.filter.js';

/**
 * Cross-cutting observability (Phase 8): health probe, global exception
 * reporting, and the env-gated Sentry integration. Marked @Global so the
 * exception filter and monitoring service are available app-wide without
 * every module importing them.
 */
@Global()
@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [HealthController],
  providers: [
    MonitoringService,
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
  ],
  exports: [MonitoringService],
})
export class MonitoringModule {}
