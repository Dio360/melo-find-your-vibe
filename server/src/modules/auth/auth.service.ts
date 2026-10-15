import { BadRequestException, HttpException, HttpStatus, Injectable, Optional, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomBytes, randomInt } from 'node:crypto';
import { createHash } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RedisService } from '../../redis/redis.service.js';
import { OtpDeliveryService } from './otp-delivery.service.js';
import { MailService } from '../mail/mail.service.js';

const OTP_TTL_SECONDS = Number(process.env.OTP_TTL_SECONDS ?? 300);
const OTP_MAX_ATTEMPTS = Number(process.env.OTP_MAX_ATTEMPTS ?? 5);
const OTP_COOLDOWN_SECONDS = 30;
const OTP_LENGTH = Number(process.env.OTP_LENGTH ?? 6);

export class RequestOtpDto {
  identifier?: string;
  phone?: string;
  email?: string;
}

export class VerifyOtpDto {
  identifier?: string;
  phone?: string;
  email?: string;
  code!: string;
}

export class PasswordDto {
  email!: string;
  password!: string;
  name?: string;
}

function toEmail(raw: unknown): string {
  const email = String(raw ?? '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    throw new BadRequestException('Invalid email address');
  }
  return email;
}

function toPassword(raw: unknown): string {
  const password = String(raw ?? '');
  if (password.length < 8 || password.length > 128) {
    throw new BadRequestException('Password must be 8..128 characters');
  }
  return password;
}

type Identity = { kind: 'phone' | 'email'; value: string };

function toIdentity(input: RequestOtpDto | VerifyOtpDto): Identity {
  const raw = (input.identifier ?? input.phone ?? input.email ?? '').trim();
  if (!raw) {
    throw new BadRequestException('Phone number or email required');
  }
  if (raw.includes('@')) {
    const email = raw.toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      throw new BadRequestException('Invalid email address');
    }
    return { kind: 'email', value: email };
  }
  const digits = raw.replace(/[^\d+]/g, '');
  if (digits.length < 7 || digits.length > 16) {
    throw new BadRequestException('Invalid phone number');
  }
  return { kind: 'phone', value: digits };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly jwt: JwtService,
    private readonly delivery: OtpDeliveryService,
    @Optional() private readonly mail?: MailService,
  ) {}

  async requestOtp(dto: RequestOtpDto) {
    const identity = toIdentity(dto);
    const redis = this.redis.raw;
    const key = `otp:${identity.kind}:${identity.value}`;

    const cooldown = await redis.get(`${key}:cooldown`);
    if (cooldown) {
      throw new HttpException('Wait before requesting another code', HttpStatus.TOO_MANY_REQUESTS);
    }

    const max = 10 ** OTP_LENGTH - 1;
    const min = 10 ** (OTP_LENGTH - 1);
    const code = String(randomInt(min, max + 1));

    // Deliver first: if the provider fails we never store a code the user
    // cannot receive, and no cooldown is consumed.
    await this.delivery.send(identity, code, OTP_TTL_SECONDS);

    await redis.set(key, JSON.stringify({ code, attempts: 0 }), 'EX', OTP_TTL_SECONDS);
    await redis.set(`${key}:cooldown`, '1', 'EX', OTP_COOLDOWN_SECONDS);

    // Dev convenience only — never return the code in production.
    const isProd = process.env.NODE_ENV === 'production';
    return {
      ok: true,
      kind: identity.kind,
      expiresIn: OTP_TTL_SECONDS,
      ...(isProd ? {} : { devCode: code }),
    };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const identity = toIdentity(dto);
    const redis = this.redis.raw;
    const key = `otp:${identity.kind}:${identity.value}`;

    const raw = await redis.get(key);
    if (!raw) {
      throw new UnauthorizedException('Code expired or not requested');
    }
    const record = JSON.parse(raw) as { code: string; attempts: number };
    if (record.attempts >= OTP_MAX_ATTEMPTS) {
      await redis.del(key);
      throw new HttpException('Too many attempts, request a new code', HttpStatus.TOO_MANY_REQUESTS);
    }
    if (record.code !== dto.code.trim()) {
      record.attempts += 1;
      await redis.set(key, JSON.stringify(record), 'KEEPTTL');
      throw new UnauthorizedException('Invalid code');
    }
    await redis.del(key);

    const where =
      identity.kind === 'phone' ? { phone: identity.value } : { email: identity.value };
    const user = await this.prisma.user.upsert({
      where,
      update: {},
      create: {
        ...(identity.kind === 'phone'
          ? { phone: identity.value }
          : { email: identity.value }),
        country: 'NG',
      },
    });

    const claims =
      identity.kind === 'phone'
        ? { sub: user.id, phone: user.phone }
        : { sub: user.id, email: user.email };
    const accessToken = await this.jwt.signAsync(claims);
    return {
      accessToken,
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        name: user.name,
        country: user.country,
      },
    };
  }

  /** Password auth (Beatboxx-style login/signup). OTP endpoints stay live
   * but the UI no longer offers them. */
  async register(dto: PasswordDto) {
    const email = toEmail(dto.email);
    const password = toPassword(dto.password);
    const name = String(dto.name ?? '').trim().slice(0, 40) || null;
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing?.passwordHash) {
      throw new HttpException('An account with this email already exists', HttpStatus.CONFLICT);
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = existing
      ? await this.prisma.user.update({ where: { email }, data: { passwordHash, ...(name ? { name } : {}) } })
      : await this.prisma.user.create({ data: { email, passwordHash, name, country: 'NG' } });
    const accessToken = await this.jwt.signAsync({ sub: user.id, email: user.email });
    return { accessToken, user: this.publicUser(user) };
  }

  async login(dto: PasswordDto) {
    const email = toEmail(dto.email);
    const password = toPassword(dto.password);
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user?.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const accessToken = await this.jwt.signAsync({ sub: user.id, email: user.email });
    return { accessToken, user: this.publicUser(user) };
  }

  private publicUser(user: { id: string; phone: string | null; email: string | null; name: string | null; country: string | null }) {
    return { id: user.id, phone: user.phone, email: user.email, name: user.name, country: user.country };
  }

  /** Password reset via email link. Forgot always returns ok (no account
   * enumeration); the token is a hashed single-use Redis secret (15 min). */
  async forgotPassword(emailRaw: string) {
    const email = toEmail(emailRaw);
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user) {
      const token = randomBytes(32).toString('hex');
      const digest = createHash('sha256').update(token).digest('hex');
      await this.redis.raw.set(`pwreset:${digest}`, user.id, 'EX', 900);
      const base = (process.env.PASSWORD_RESET_URL_BASE ?? '').trim()
        || (process.env.CORS_ORIGINS ?? '').split(',')[0]?.trim()
        || 'http://localhost:3000';
      const link = `${base.replace(/\/+$/, '')}/reset-password?token=${token}`;
      if (this.mail) {
        await this.mail
          .sendEmail(email, 'Reset your MELO password', `Reset your password here (expires in 15 minutes): ${link}`)
          .catch(() => undefined);
      }
    }
    return { ok: true };
  }

  async resetPassword(tokenRaw: string, passwordRaw: string) {
    const token = String(tokenRaw ?? '').trim();
    if (!/^[0-9a-f]{64}$/.test(token)) {
      throw new UnauthorizedException('Invalid or expired reset link');
    }
    const password = toPassword(passwordRaw);
    const digest = createHash('sha256').update(token).digest('hex');
    const userId = await this.redis.raw.get(`pwreset:${digest}`);
    if (!userId) {
      throw new UnauthorizedException('Invalid or expired reset link');
    }
    await this.redis.raw.del(`pwreset:${digest}`);
    const passwordHash = await bcrypt.hash(password, 10);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    return { ok: true };
  }

  /** Google sign-in (inert unless GOOGLE_CLIENT_ID is set). Verifies the
   * GIS ID token with Google, then finds-or-creates the user by email. */
  async googleLogin(idTokenRaw: string) {
    const clientId = (process.env.GOOGLE_CLIENT_ID ?? '').trim();
    if (!clientId) {
      throw new HttpException('Google sign-in is not configured', HttpStatus.SERVICE_UNAVAILABLE);
    }
    const idToken = String(idTokenRaw ?? '').trim();
    if (!idToken) throw new UnauthorizedException('Missing Google credential');
    let payload: { email?: string; email_verified?: boolean; name?: string; sub?: string };
    try {
      const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      payload = (await res.json()) as typeof payload;
    } catch {
      throw new UnauthorizedException('Invalid Google credential');
    }
    if (!payload.email || payload.email_verified === false) {
      throw new UnauthorizedException('Google email not verified');
    }
    const email = toEmail(payload.email);
    const aud = (payload as { aud?: string }).aud;
    if (aud !== clientId) {
      throw new UnauthorizedException('Google credential audience mismatch');
    }
    const name = String(payload.name ?? '').trim().slice(0, 40) || null;
    const user = await this.prisma.user.upsert({
      where: { email },
      update: { ...(name ? { name } : {}) },
      create: { email, name, country: 'NG' },
    });
    const accessToken = await this.jwt.signAsync({ sub: user.id, email: user.email });
    return { accessToken, user: this.publicUser(user) };
  }
}
