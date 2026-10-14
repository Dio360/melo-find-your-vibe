import { Injectable, Logger } from '@nestjs/common';

/**
 * Transactional email sender (stack v2).
 * Primary: Mailofly (MAILOFLY_API_KEY). Fallback: Resend (RESEND_API_KEY).
 * Both use the same request shape: POST {from, to[], subject, html/text}
 * with a Bearer API key, so the fallback is a one-line endpoint swap.
 * No email is invented: callers pass explicit subject + body.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  async sendEmail(to: string, subject: string, text: string): Promise<void> {
    const from = (process.env.MAILOFLY_FROM ?? process.env.EMAIL_FROM ?? '').trim();
    if (!from) {
      throw new Error('Email sender is not configured (set MAILOFLY_FROM or EMAIL_FROM)');
    }
    const html = `<p>${escapeHtml(text)}</p>`;
    // account_key pins the send to the connected Gmail identity when set
    // (required when the workspace holds multiple identities).
    const accountKey = (process.env.MAILOFLY_ACCOUNT_KEY ?? '').trim();
    const payload: Record<string, unknown> = { from, to: [to], subject, text, html };
    if (accountKey) payload['account_key'] = accountKey;
    // Mailofly primary, Resend fallback: if the primary rejects (e.g. sender
    // identity not connected yet), the email still goes out. Both providers
    // share the same request shape, so this is a safe downgrade, not a retry
    // storm — exactly one send is attempted per provider.
    const mailoflyKey = (process.env.MAILOFLY_API_KEY ?? '').trim();
    if (mailoflyKey) {
      try {
        await this.post(
          'https://api.mailofly.com/emails',
          mailoflyKey,
          payload,
          'Mailofly',
        );
        return;
      } catch (err) {
        this.logger.warn(`Mailofly failed, falling back to Resend: ${(err as Error).message}`);
      }
    }
    const resendKey = (process.env.RESEND_API_KEY ?? '').trim();
    if (resendKey) {
      await this.post(
        'https://api.resend.com/emails',
        resendKey,
        { from, to: [to], subject, text },
        'Resend',
      );
      return;
    }
    throw new Error('No email provider configured (set MAILOFLY_API_KEY or RESEND_API_KEY)');
  }

  private async post(
    url: string,
    apiKey: string,
    body: unknown,
    provider: string,
  ): Promise<void> {
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify(body),
      });
    } catch (err) {
      this.logger.error(`${provider} request failed: ${(err as Error).message}`);
      throw new Error(`${provider} unreachable`);
    }
    if (!response.ok) {
      this.logger.error(`${provider} send failed: HTTP ${response.status}`);
      throw new Error(`${provider} rejected the send (HTTP ${response.status})`);
    }
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
