import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RightsService } from './rights.service.js';
import type { PrismaService } from '../../prisma/prisma.service.js';

// ContentRight shape as returned by prisma (include: { rights: true }).
function right(overrides: Record<string, unknown> = {}) {
  return {
    status: 'active',
    streamingAllowed: true,
    territory: 'NG',
    startAt: null,
    endAt: null,
    ...overrides,
  };
}

function track(rights: unknown[], status = 'active') {
  return { id: 't1', status, rights };
}

describe('RightsService.canUserPlayTrack', () => {
  let service: RightsService;
  let prisma: { track: { findUnique: ReturnType<typeof vi.fn> } };

  beforeEach(() => {
    prisma = { track: { findUnique: vi.fn() } };
    service = new RightsService(prisma as unknown as PrismaService);
  });

  it('denies with "unavailable" when the track does not exist', async () => {
    prisma.track.findUnique.mockResolvedValue(null);
    await expect(service.canUserPlayTrack('missing')).resolves.toEqual({
      allowed: false,
      reason: 'unavailable',
    });
  });

  it('denies with "unavailable" when the track is not active', async () => {
    prisma.track.findUnique.mockResolvedValue(track([right()], 'draft'));
    await expect(service.canUserPlayTrack('t1')).resolves.toEqual({
      allowed: false,
      reason: 'unavailable',
    });
  });

  it('denies with "not-licensed" when there are no rights rows', async () => {
    prisma.track.findUnique.mockResolvedValue(track([]));
    await expect(service.canUserPlayTrack('t1')).resolves.toEqual({
      allowed: false,
      reason: 'not-licensed',
    });
  });

  it('denies when streaming is not allowed for the matched right', async () => {
    prisma.track.findUnique.mockResolvedValue(track([right({ streamingAllowed: false })]));
    await expect(service.canUserPlayTrack('t1')).resolves.toEqual({
      allowed: false,
      reason: 'not-licensed',
    });
  });

  it('denies when the right is for a different territory (no wildcard)', async () => {
    prisma.track.findUnique.mockResolvedValue(track([right({ territory: 'GH' })]));
    await expect(service.canUserPlayTrack('t1', 'NG')).resolves.toEqual({
      allowed: false,
      reason: 'not-licensed',
    });
  });

  it('denies when the right row is inactive even if streamingAllowed', async () => {
    prisma.track.findUnique.mockResolvedValue(track([right({ status: 'revoked' })]));
    await expect(service.canUserPlayTrack('t1')).resolves.toEqual({
      allowed: false,
      reason: 'not-licensed',
    });
  });

  it('allows via wildcard territory "*" regardless of requested territory', async () => {
    prisma.track.findUnique.mockResolvedValue(track([right({ territory: '*' })]));
    await expect(service.canUserPlayTrack('t1', 'ZA')).resolves.toEqual({ allowed: true });
  });

  it('allows an exact territory match', async () => {
    prisma.track.findUnique.mockResolvedValue(track([right({ territory: 'NG' })]));
    await expect(service.canUserPlayTrack('t1', 'NG')).resolves.toEqual({ allowed: true });
  });

  it('denies when the licensing window has not started yet', async () => {
    const future = new Date(Date.now() + 60_000);
    prisma.track.findUnique.mockResolvedValue(track([right({ startAt: future })]));
    await expect(service.canUserPlayTrack('t1')).resolves.toEqual({
      allowed: false,
      reason: 'not-licensed',
    });
  });

  it('denies when the licensing window has already ended', async () => {
    const past = new Date(Date.now() - 60_000);
    prisma.track.findUnique.mockResolvedValue(track([right({ endAt: past })]));
    await expect(service.canUserPlayTrack('t1')).resolves.toEqual({
      allowed: false,
      reason: 'not-licensed',
    });
  });

  it('allows when now falls inside an active licensing window', async () => {
    const start = new Date(Date.now() - 60_000);
    const end = new Date(Date.now() + 60_000);
    prisma.track.findUnique.mockResolvedValue(track([right({ startAt: start, endAt: end })]));
    await expect(service.canUserPlayTrack('t1')).resolves.toEqual({ allowed: true });
  });

  it('allows when one of several rights rows satisfies the conditions', async () => {
    prisma.track.findUnique.mockResolvedValue(
      track([
        right({ territory: 'GH' }), // wrong territory
        right({ streamingAllowed: false }), // no streaming
        right({ territory: '*' }), // the winner
      ]),
    );
    await expect(service.canUserPlayTrack('t1', 'NG')).resolves.toEqual({ allowed: true });
  });
});
