import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomInt } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RedisService } from '../../redis/redis.service.js';
import { OtpDeliveryService } from './otp-delivery.service.js';

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
}
