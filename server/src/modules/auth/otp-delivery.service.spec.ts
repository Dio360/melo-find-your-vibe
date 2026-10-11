import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OtpDeliveryService } from './otp-delivery.service.js';

const ENV_KEYS = [
  'NODE_ENV',
  'TERMII_API_KEY',
  'TERMII_SENDER_ID',
  'TERMII_BASE_URL',
  'RESEND_API_KEY',
  'EMAIL_FROM',
];

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

describe('OtpDeliveryService', () => {
  let service: OtpDeliveryService;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    service = new OtpDeliveryService();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    for (const key of ENV_KEYS) delete process.env[key];
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  describe('dev fallback (no provider configured)', () => {
    it('does not throw for phone outside production', async () => {
      await expect(
        service.send({ kind: 'phone', value: '+2348012345678' }, '123456', 300),
      ).resolves.toBeUndefined();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('does not throw for email outside production', async () => {
      await expect(
        service.send({ kind: 'email', value: 'ada@example.com' }, '123456', 300),
      ).resolves.toBeUndefined();
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('production fail-loud gate', () => {
    it('throws 503 for phone when TERMII_API_KEY is missing', async () => {
      process.env.NODE_ENV = 'production';
      await expect(
        service.send({ kind: 'phone', value: '+2348012345678' }, '123456', 300),
      ).rejects.toMatchObject({ status: 503 });
    });

    it('throws 503 for email when RESEND_API_KEY is missing', async () => {
      process.env.NODE_ENV = 'production';
      await expect(
        service.send({ kind: 'email', value: 'ada@example.com' }, '123456', 300),
      ).rejects.toMatchObject({ status: 503 });
    });

    it('throws 503 for email when EMAIL_FROM is missing even with an API key', async () => {
      process.env.NODE_ENV = 'production';
      process.env.RESEND_API_KEY = 're_123';
      await expect(
        service.send({ kind: 'email', value: 'ada@example.com' }, '123456', 300),
      ).rejects.toMatchObject({ status: 503 });
    });
  });

  describe('Termii SMS', () => {
    it('posts the code to Termii with the configured sender', async () => {
      process.env.TERMII_API_KEY = 'termii-key';
      process.env.TERMII_SENDER_ID = 'MELO-NG';
      fetchMock.mockResolvedValue(jsonResponse(200, { status: 'success' }));

      await service.send({ kind: 'phone', value: '+2348012345678' }, '123456', 300);

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.termii.com/api/sms/send',
        expect.objectContaining({ method: 'POST' }),
      );
      const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
      expect(body).toMatchObject({ to: '+2348012345678', from: 'MELO-NG', api_key: 'termii-key' });
      expect(body.sms).toContain('123456');
    });

    it('honours TERMII_BASE_URL for regional endpoints', async () => {
      process.env.TERMII_API_KEY = 'termii-key';
      process.env.TERMII_BASE_URL = 'https://api.termii.eu/';
      fetchMock.mockResolvedValue(jsonResponse(200, { status: 'success' }));

      await service.send({ kind: 'phone', value: '+2348012345678' }, '123456', 300);

      expect(fetchMock.mock.calls[0][0]).toBe('https://api.termii.eu/api/sms/send');
    });

    it('throws 502 when Termii rejects the send', async () => {
      process.env.TERMII_API_KEY = 'termii-key';
      fetchMock.mockResolvedValue(jsonResponse(200, { status: 'error', message: 'bad number' }));

      await expect(
        service.send({ kind: 'phone', value: '+234801' }, '123456', 300),
      ).rejects.toMatchObject({ status: 502 });
    });

    it('throws 502 when the provider is unreachable', async () => {
      process.env.TERMII_API_KEY = 'termii-key';
      fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));

      await expect(
        service.send({ kind: 'phone', value: '+2348012345678' }, '123456', 300),
      ).rejects.toMatchObject({ status: 502 });
    });
  });

  describe('Resend email', () => {
    it('posts a formatted email with the configured from address', async () => {
      process.env.RESEND_API_KEY = 're_123';
      process.env.EMAIL_FROM = 'MELO <otp@melo.app>';
      fetchMock.mockResolvedValue(jsonResponse(200, { id: 'msg_1' }));

      await service.send({ kind: 'email', value: 'ada@example.com' }, '654321', 300);

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.resend.com/emails',
        expect.objectContaining({ method: 'POST' }),
      );
      const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
      expect(body).toMatchObject({
        from: 'MELO <otp@melo.app>',
        to: ['ada@example.com'],
        subject: 'Your MELO login code',
      });
      expect(body.text).toContain('654321');
    });

    it('throws 502 when Resend returns a non-2xx', async () => {
      process.env.RESEND_API_KEY = 're_123';
      process.env.EMAIL_FROM = 'MELO <otp@melo.app>';
      fetchMock.mockResolvedValue(jsonResponse(401, { message: 'invalid api key' }));

      await expect(
        service.send({ kind: 'email', value: 'ada@example.com' }, '123456', 300),
      ).rejects.toMatchObject({ status: 502 });
    });
  });

  describe('code expiry wording', () => {
    it('states the TTL in the message', async () => {
      process.env.RESEND_API_KEY = 're_123';
      process.env.EMAIL_FROM = 'MELO <otp@melo.app>';
      fetchMock.mockResolvedValue(jsonResponse(200, {}));

      await service.send({ kind: 'email', value: 'ada@example.com' }, '123456', 600);

      const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
      expect(body.text).toContain('10 minutes');
    });
  });
});
