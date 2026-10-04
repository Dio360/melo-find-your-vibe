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

const OTP_TTL_SECONDS = Number(process.env.OTP_TTL_SECONDS ?? 300);
const OTP_MAX_ATTEMPTS = Number(process.env.OTP_MAX_ATTEMPTS ?? 5);
const OTP_COOLDOWN_SECONDS = 30;
const OTP_LENGTH = Number(process.env.OTP_LENGTH ?? 6);

export class RequestOtpDto {
  phone!: string;
}

export class VerifyOtpDto {
  phone!: string;
  code!: string;
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, '');
  if (digits.length < 7 || digits.length > 16) {
    throw new BadRequestException('Invalid phone number');
  }
  return digits;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly jwt: JwtService,
  ) {}

  async requestOtp(dto: RequestOtpDto) {
    const phone = normalizePhone(dto.phone);
    const redis = this.redis.raw;

    const cooldown = await redis.get(`otp:cooldown:${phone}`);
    if (cooldown) {
      throw new HttpException('Wait before requesting another code', HttpStatus.TOO_MANY_REQUESTS);
    }

    const max = 10 ** OTP_LENGTH - 1;
    const min = 10 ** (OTP_LENGTH - 1);
    const code = String(randomInt(min, max + 1));

    await redis.set(
      `otp:${phone}`,
      JSON.stringify({ code, attempts: 0 }),
      'EX',
      OTP_TTL_SECONDS,
    );
    await redis.set(`otp:cooldown:${phone}`, '1', 'EX', OTP_COOLDOWN_SECONDS);

    // TODO (Phase 2): deliver via SMS provider (Termii/Africa's Talking).
    // Dev convenience only — never return the code in production.
    const isProd = process.env.NODE_ENV === 'production';
    return {
      ok: true,
      phone,
      expiresIn: OTP_TTL_SECONDS,
      ...(isProd ? {} : { devCode: code }),
    };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const phone = normalizePhone(dto.phone);
    const redis = this.redis.raw;

    const raw = await redis.get(`otp:${phone}`);
    if (!raw) {
      throw new UnauthorizedException('Code expired or not requested');
    }
    const record = JSON.parse(raw) as { code: string; attempts: number };
    if (record.attempts >= OTP_MAX_ATTEMPTS) {
      await redis.del(`otp:${phone}`);
      throw new HttpException('Too many attempts, request a new code', HttpStatus.TOO_MANY_REQUESTS);
    }
    if (record.code !== dto.code.trim()) {
      record.attempts += 1;
      await redis.set(`otp:${phone}`, JSON.stringify(record), 'KEEPTTL');
      throw new UnauthorizedException('Invalid code');
    }
    await redis.del(`otp:${phone}`);

    const user = await this.prisma.user.upsert({
      where: { phone },
      update: {},
      create: { phone, country: 'NG' },
    });

    const accessToken = await this.jwt.signAsync({ sub: user.id, phone: user.phone });
    return {
      accessToken,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        country: user.country,
      },
    };
  }
}
