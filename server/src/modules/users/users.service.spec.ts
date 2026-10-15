import { describe, it, expect, vi } from 'vitest';
import { UsersService } from './users.service.js';
import type { PrismaService } from '../../prisma/prisma.service.js';

// passwordHash must never leave the API, even though the column exists.
describe('UsersService', () => {
  it('me() excludes passwordHash', async () => {
    const findUniqueOrThrow = vi.fn().mockImplementation(async (args: unknown) => {
      const select = (args as { select: Record<string, boolean> }).select;
      expect(select).not.toHaveProperty('passwordHash');
      return { id: 'u1', email: 'a@x.io' };
    });
    const service = new UsersService({ user: { findUniqueOrThrow } } as unknown as PrismaService);
    const me = await service.me('u1');
    expect(me).not.toHaveProperty('passwordHash');
  });

  it('updateProfile() excludes passwordHash', async () => {
    const update = vi.fn().mockImplementation(async (args: unknown) => {
      const select = (args as { select: Record<string, boolean> }).select;
      expect(select).not.toHaveProperty('passwordHash');
      return { id: 'u1', name: 'Ada' };
    });
    const service = new UsersService({ user: { update } } as unknown as PrismaService);
    const updated = await service.updateProfile('u1', { name: 'Ada' });
    expect(updated).not.toHaveProperty('passwordHash');
  });
});
