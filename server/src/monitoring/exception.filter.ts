import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { MonitoringService } from './monitoring.service.js';

/**
 * Global exception filter (Phase 8).
 * Normalizes unexpected errors to a 500 JSON body and reports every 5xx
 * (plus unhandled non-HTTP errors) to the monitoring backend. 4xx client
 * errors are left alone to avoid flooding the pipeline with noise.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  constructor(private readonly monitoring: MonitoringService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else {
        const m = (res as { message?: string | string[] }).message;
        message = Array.isArray(m) ? m.join('; ') : (m ?? exception.message);
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    // Only server-side faults are reportable; 4xx are caller mistakes.
    if (status >= 500) {
      this.monitoring.captureException(exception, {
        method: request.method,
        path: request.url,
        status,
      });
      this.logger.error(
        `${request.method} ${request.url} ${status}: ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(status).json({
      statusCode: status,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
