import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { GlobalExceptionFilter } from './exception.filter.js';
import type { MonitoringService } from './monitoring.service.js';

function makeHost() {
  const response = { status: vi.fn().mockReturnThis(), json: vi.fn() };
  const request = { method: 'POST', url: '/api/v1/ai/playlist' };
  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => request,
    }),
  } as unknown as ArgumentsHost;
  return { host, response };
}

describe('GlobalExceptionFilter', () => {
  let monitoring: { captureException: ReturnType<typeof vi.fn> };
  let filter: GlobalExceptionFilter;

  beforeEach(() => {
    monitoring = { captureException: vi.fn() };
    filter = new GlobalExceptionFilter(monitoring as unknown as MonitoringService);
  });

  it('reports a 5xx HttpException to monitoring and returns its JSON body', () => {
    const { host, response } = makeHost();
    filter.catch(new HttpException('boom', HttpStatus.INTERNAL_SERVER_ERROR), host);
    expect(monitoring.captureException).toHaveBeenCalledTimes(1);
    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 500, message: 'boom', path: '/api/v1/ai/playlist' }),
    );
  });

  it('reports an unexpected non-HTTP error as a 500', () => {
    const { host, response } = makeHost();
    filter.catch(new TypeError('undefined is not a function'), host);
    expect(monitoring.captureException).toHaveBeenCalledTimes(1);
    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 500, message: 'undefined is not a function' }),
    );
  });

  it('does NOT report client 4xx errors to monitoring', () => {
    const { host, response } = makeHost();
    filter.catch(new HttpException('bad request', HttpStatus.BAD_REQUEST), host);
    expect(monitoring.captureException).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(400);
  });

  it('flattens a validation-error message array into a string', () => {
    const { host, response } = makeHost();
    filter.catch(
      new HttpException({ message: ['title is required', 'duration is required'] }, HttpStatus.BAD_REQUEST),
      host,
    );
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'title is required; duration is required' }),
    );
  });
});
