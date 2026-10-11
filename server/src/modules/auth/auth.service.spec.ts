import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  AuthService,
  type RequestOtpDto,
  type VerifyOtpDto,
} from './auth.service.js';
import type { PrismaService } from '../../prisma/prisma.service.js';
import type { RedisService } from '../../redis/redis.service.js';
import type { JwtService } from '@nestjs/jwt';

// In-memory stand-in for the small slice of ioredis the service touches.
function fakeRedis() {
  const store = new Map<string, string>();
  return {
    store,
    get: vi.fn(async (k: string) => store.get(k) ?? null),
    set: vi.fn(async (k: string, v: string) => {
      store.set(k, v);
      return 'OK';
    }),
    del: vi.fn(async (k: string) => {
      store.delete(k);
      return 1;
    }),
  };
}

describe('AuthService', () => {
  let redis: ReturnType<typeof fakeRedis>;
  let prisma: { user: { upsert: ReturnType<typeof vi.fn> } };
  let jwt: { signAsync: ReturnType<typeof vi.fn> };
  let service: AuthService;

  beforeEach(() => {
    redis = fakeRedis();
    prisma = { user: { upsert: vi.fn() } };
    jwt = { signAsync: vi.fn().mockResolvedValue('signed.jwt.token') };
    service = new AuthService(
      prisma as unknown as PrismaService,
      { raw: redis } as unknown as RedisService,
      jwt as unknown as JwtService,
    );
    delete process.env.NODE_ENV;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('identity validation', () => {
    it('rejects an empty request', async () => {
      await expect(service.requestOtp({} as RequestOtpDto)).rejects.toThrow(
        /Phone number or email required/,
      );
    });

    it('rejects a malformed email', async () => {
      // Must contain "@" to reach the email branch, but fail the format regex.
      await expect(service.requestOtp({ email: 'ada@nodotcom' })).rejects.toThrow(
        /Invalid email address/,
      );
    });

    it('routes an @-less string to the phone check, not the email check', async () => {
      await expect(service.requestOtp({ email: 'not-an-email' })).rejects.toThrow(
        /Invalid phone number/,
      );
    });

    it('rejects a phone number that is too short', async () => {
      await expect(service.requestOtp({ phone: '123' })).rejects.toThrow(/Invalid phone number/);
    });

    it('classifies and normalizes an email identity', async () => {
      await service.requestOtp({ email: '  Ada@Example.COM ' });
      expect(redis.set).toHaveBeenCalledWith(
        'otp:email:ada@example.com',
        expect.any(String),
        'EX',
        expect.any(Number),
      );
    });

    it('classifies and strips a phone identity down to digits', async () => {
      await service.requestOtp({ phone: '+234 801 234 5678' });
      expect(redis.set).toHaveBeenCalledWith(
        'otp:phone:+2348012345678',
        expect.any(String),
        'EX',
        expect.any(Number),
      );
    });

    it('accepts the legacy "identifier" field as either kind', async () => {
      await service.requestOtp({ identifier: 'user@x.io' } as RequestOtpDto);
      expect(redis.set).toHaveBeenCalledWith(
        'otp:email:user@x.io',
        expect.any(String),
        'EX',
        expect.any(Number),
      );
    });
  });

  describe('requestOtp', () => {
    it('stores a code and enforces the cooldown window', async () => {
      const res = await service.requestOtp({ phone: '08012345678' });
      expect(res.ok).toBe(true);
      expect(res.kind).toBe('phone');
      // First call sets the code and the cooldown key.
      expect(redis.store.has('otp:phone:08012345678')).toBe(true);
      expect(redis.store.has('otp:phone:08012345678:cooldown')).toBe(true);
    });

    it('throws 429 when a cooldown is still active', async () => {
      redis.store.set('otp:phone:08012345678:cooldown', '1');
      await expect(service.requestOtp({ phone: '08012345678' })).rejects.toMatchObject({
        status: 429,
      });
    });

    it('returns a devCode outside production', async () => {
      const res = await service.requestOtp({ phone: '08012345678' });
      expect(res).toHaveProperty('devCode');
      expect(String((res as { devCode: string }).devCode)).toHaveLength(6);
    });

    it('never returns a devCode in production', async () => {
      process.env.NODE_ENV = 'production';
      const res = await service.requestOtp({ phone: '08012345678' });
      expect(res).not.toHaveProperty('devCode');
    });
  });

  describe('verifyOtp', () => {
    const phone = '08012345678';

    function seed(code = '123456', attempts = 0) {
      redis.store.set(`otp:phone:${phone}`, JSON.stringify({ code, attempts }));
    }

    it('rejects when no code was requested (expired/absent)', async () => {
      await expect(
        service.verifyOtp({ phone, code: '123456' } as VerifyOtpDto),
      ).rejects.toMatchObject({ status: 401 });
    });

    it('rejects a wrong code and increments the attempt counter', async () => {
      seed('123456', 0);
      await expect(
        service.verifyOtp({ phone, code: '999999' } as VerifyOtpDto),
      ).rejects.toMatchObject({ status: 401 });
      const stored = JSON.parse(redis.store.get(`otp:phone:${phone}`)!);
      expect(stored.attempts).toBe(1);
      // Code is still there for the next try (KEEPTTL semantics).
      expect(redis.store.has(`otp:phone:${phone}`)).toBe(true);
    });

    it('locks out after the max attempts and deletes the code', async () => {
      seed('123456', 5); // already at OTP_MAX_ATTEMPTS
      await expect(
        service.verifyOtp({ phone, code: '123456' } as VerifyOtpDto),
      ).rejects.toMatchObject({ status: 429 });
      expect(redis.store.has(`otp:phone:${phone}`)).toBe(false);
    });

    it('upserts the user and returns a JWT on the correct code', async () => {
      seed('123456', 0);
      prisma.user.upsert.mockResolvedValue({
        id: 'u1',
        phone,
        email: null,
        name: null,
        country: 'NG',
      });
      const res = await service.verifyOtp({ phone, code: '123456' } as VerifyOtpDto);
      expect(res.accessToken).toBe('signed.jwt.token');
      expect(res.user).toMatchObject({ id: 'u1', phone });
      expect(prisma.user.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { phone } }),
      );
      // One-time use: the code is consumed.
      expect(redis.store.has(`otp:phone:${phone}`)).toBe(false);
      expect(jwt.signAsync).toHaveBeenCalledWith({ sub: 'u1', phone });
    });

    it('signs email claims for an email identity', async () => {
      const email = 'ada@x.io';
      redis.store.set(`otp:email:${email}`, JSON.stringify({ code: '123456', attempts: 0 }));
      prisma.user.upsert.mockResolvedValue({
        id: 'u2',
        phone: null,
        email,
        name: null,
        country: 'NG',
      });
      await service.verifyOtp({ email, code: '123456' } as VerifyOtpDto);
      expect(jwt.signAsync).toHaveBeenCalledWith({ sub: 'u2', email });
      expect(prisma.user.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { email } }),
      );
    });
  });
});
