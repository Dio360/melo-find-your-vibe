import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MailService } from './mail.service.js';

const ENV_KEYS = ['MAILOFLY_API_KEY', 'MAILOFLY_FROM', 'RESEND_API_KEY', 'EMAIL_FROM'];

function jsonResponse(status: number, body: unknown): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as unknown as Response;
}

describe('MailService', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    for (const key of ENV_KEYS) delete process.env[key];
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('throws when no sender is configured', async () => {
    await expect(new MailService().sendEmail('a@b.com', 's', 't')).rejects.toThrow(
      /not configured/,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends via Mailofly when configured and never touches Resend', async () => {
    process.env.MAILOFLY_API_KEY = 'mf_123';
    process.env.MAILOFLY_FROM = 'MELO <m@x.io>';
    process.env.RESEND_API_KEY = 're_123';
    fetchMock.mockResolvedValue(jsonResponse(200, { id: 'msg_1' }));

    await new MailService().sendEmail('a@b.com', 'Hi', 'hello');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.mailofly.com/emails');
    expect(fetchMock.mock.calls[0][1].headers).toMatchObject({ Authorization: 'Bearer mf_123' });
  });

  it('falls back to Resend when Mailofly rejects', async () => {
    process.env.MAILOFLY_API_KEY = 'mf_123';
    process.env.MAILOFLY_FROM = 'MELO <m@x.io>';
    process.env.RESEND_API_KEY = 're_123';
    fetchMock
      .mockResolvedValueOnce(jsonResponse(403, { message: 'sender not verified' }))
      .mockResolvedValueOnce(jsonResponse(200, { id: 'msg_2' }));

    await new MailService().sendEmail('a@b.com', 'Hi', 'hello');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.mailofly.com/emails');
    expect(fetchMock.mock.calls[1][0]).toBe('https://api.resend.com/emails');
  });

  it('throws when both providers fail', async () => {
    process.env.MAILOFLY_API_KEY = 'mf_123';
    process.env.MAILOFLY_FROM = 'MELO <m@x.io>';
    process.env.RESEND_API_KEY = 're_123';
    fetchMock.mockResolvedValue(jsonResponse(500, {}));

    await expect(new MailService().sendEmail('a@b.com', 'Hi', 'hello')).rejects.toThrow(
      /Resend/,
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
