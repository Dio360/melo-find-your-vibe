import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';

type Identity = { kind: 'phone' | 'email'; value: string };

/**
 * OTP delivery (launch gate).
 *
 * Channel is chosen per identity kind:
 *   phone → Termii SMS   (TERMII_API_KEY, optional TERMII_SENDER_ID / TERMII_BASE_URL)
 *   email → Resend email (RESEND_API_KEY + EMAIL_FROM)
 *
 * Outside production, missing credentials fall back to a dev log line so the
 * existing devCode flow keeps working. In production a missing credential
 * throws 503 so the API fails loudly instead of silently accepting logins
 * whose codes can never arrive.
 */
@Injectable()
export class OtpDeliveryService {
  private readonly logger = new Logger(OtpDeliveryService.name);

  async send(identity: Identity, code: string, ttlSeconds: number): Promise<void> {
    if (identity.kind === 'phone') return this.sendSms(identity.value, code, ttlSeconds);
    return this.sendEmail(identity.value, code, ttlSeconds);
  }

  private message(code: string, ttlSeconds: number): string {
    const minutes = Math.max(1, Math.round(ttlSeconds / 60));
    return `Your MELO login code is ${code}. It expires in ${minutes} minute${
      minutes === 1 ? '' : 's'
    }.`;
  }

  private isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  private async sendSms(to: string, code: string, ttlSeconds: number): Promise<void> {
    const apiKey = (process.env.TERMII_API_KEY ?? '').trim();
    if (!apiKey) {
      if (this.isProduction()) {
        throw new HttpException(
          'OTP delivery for phone is not configured (set TERMII_API_KEY)',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }
      this.logger.warn(`[dev fallback] SMS OTP for ${redact(to)}: ${code}`);
      return;
    }

    const base = (process.env.TERMII_BASE_URL ?? 'https://api.termii.com').replace(/\/+$/, '');
    const response = await this.postJson(`${base}/api/sms/send`, {
      to,
      from: process.env.TERMII_SENDER_ID ?? 'MELO',
      sms: this.message(code, ttlSeconds),
      type: 'plain',
      channel: 'generic',
      api_key: apiKey,
    });

    const body = (await response.json().catch(() => null)) as { status?: string } | null;
    if (!response.ok || (body?.status && body.status !== 'success')) {
      this.logger.error(`Termii send failed: HTTP ${response.status} status=${body?.status}`);
      throw new HttpException('Could not send SMS right now', HttpStatus.BAD_GATEWAY);
    }
  }

  private async sendEmail(to: string, code: string, ttlSeconds: number): Promise<void> {
    const apiKey = (process.env.RESEND_API_KEY ?? '').trim();
    if (!apiKey) {
      if (this.isProduction()) {
        throw new HttpException(
          'OTP delivery for email is not configured (set RESEND_API_KEY and EMAIL_FROM)',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }
      this.logger.warn(`[dev fallback] email OTP for ${redact(to)}: ${code}`);
      return;
    }
    const from = (process.env.EMAIL_FROM ?? '').trim();
    if (!from) {
      throw new HttpException(
        'OTP delivery for email is not configured (set EMAIL_FROM)',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const response = await this.postJson('https://api.resend.com/emails', {
      from,
      to: [to],
      subject: 'Your MELO login code',
      text: this.message(code, ttlSeconds),
    });

    if (!response.ok) {
      this.logger.error(`Resend send failed: HTTP ${response.status}`);
      throw new HttpException('Could not send email right now', HttpStatus.BAD_GATEWAY);
    }
  }

  private async postJson(url: string, body: unknown): Promise<Response> {
    try {
      return await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch (err) {
      this.logger.error(`OTP provider request failed: ${(err as Error).message}`);
      throw new HttpException('Could not send code right now', HttpStatus.BAD_GATEWAY);
    }
  }
}

/** Mask an identifier for logs: +2348012345678 → +234*****5678, a@b.com → a***@b.com. */
function redact(value: string): string {
  if (value.includes('@')) {
    const [user, domain] = value.split('@');
    return `${user.slice(0, 1)}***@${domain}`;
  }
  return value.slice(0, Math.max(3, value.length - 4)) + '****' + value.slice(-4);
}
