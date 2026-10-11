import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PlaybackService } from './playback.service.js';
import type { PrismaService } from '../../prisma/prisma.service.js';
import type { RightsService } from './rights.service.js';
import type { StorageService } from '../storage/storage.service.js';

function asset(bitrate: number, status = 'ready', key = `k-${bitrate}`) {
  return { storageKey: key, bitrate, status };
}

function trackWithAssets(assets: unknown[]) {
  return {
    id: 't1',
    versions: [{ assets }],
  };
}

describe('PlaybackService.authorize', () => {
  let service: PlaybackService;
  let prisma: { track: { findUniqueOrThrow: ReturnType<typeof vi.fn> } };
  let rights: { canUserPlayTrack: ReturnType<typeof vi.fn> };
  let storage: { presignedGetUrl: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    prisma = { track: { findUniqueOrThrow: vi.fn() } };
    rights = { canUserPlayTrack: vi.fn() };
    storage = { presignedGetUrl: vi.fn().mockResolvedValue('https://cdn/signed') };
    service = new PlaybackService(
      prisma as unknown as PrismaService,
      rights as unknown as RightsService,
      storage as unknown as StorageService,
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('propagates a rights denial without touching storage or the catalogue', async () => {
    rights.canUserPlayTrack.mockResolvedValue({ allowed: false, reason: 'not-licensed' });
    const res = await service.authorize('t1');
    expect(res).toEqual({ allowed: false, reason: 'not-licensed' });
    expect(prisma.track.findUniqueOrThrow).not.toHaveBeenCalled();
    expect(storage.presignedGetUrl).not.toHaveBeenCalled();
  });

  it('passes the requested territory down to the rights check', async () => {
    rights.canUserPlayTrack.mockResolvedValue({ allowed: false, reason: 'unavailable' });
    await service.authorize('t1', 'balanced', 'GH');
    expect(rights.canUserPlayTrack).toHaveBeenCalledWith('t1', 'GH');
  });

  it('selects the exact-bitrate asset for "high" (320)', async () => {
    rights.canUserPlayTrack.mockResolvedValue({ allowed: true });
    prisma.track.findUniqueOrThrow.mockResolvedValue(
      trackWithAssets([asset(64), asset(128), asset(320)]),
    );
    const res = await service.authorize('t1', 'high');
    expect(res.allowed).toBe(true);
    expect(res.bitrate).toBe(320);
    expect(storage.presignedGetUrl).toHaveBeenCalledWith('k-320', expect.any(Number));
  });

  it('selects the 64kbps asset for "data_saver"', async () => {
    rights.canUserPlayTrack.mockResolvedValue({ allowed: true });
    prisma.track.findUniqueOrThrow.mockResolvedValue(
      trackWithAssets([asset(64), asset(128), asset(320)]),
    );
    const res = await service.authorize('t1', 'data_saver');
    expect(res.bitrate).toBe(64);
    expect(storage.presignedGetUrl).toHaveBeenCalledWith('k-64', expect.any(Number));
  });

  it('falls back to the first available asset when no exact bitrate matches', async () => {
    rights.canUserPlayTrack.mockResolvedValue({ allowed: true });
    prisma.track.findUniqueOrThrow.mockResolvedValue(trackWithAssets([asset(96)]));
    const res = await service.authorize('t1', 'high'); // wants 320, none present
    expect(res.allowed).toBe(true);
    expect(res.bitrate).toBe(96);
    expect(storage.presignedGetUrl).toHaveBeenCalledWith('k-96', expect.any(Number));
  });

  it('ignores assets that are not ready or demo and returns "no-stream" when none remain', async () => {
    rights.canUserPlayTrack.mockResolvedValue({ allowed: true });
    prisma.track.findUniqueOrThrow.mockResolvedValue(
      trackWithAssets([asset(128, 'processing'), asset(320, 'failed')]),
    );
    const res = await service.authorize('t1');
    expect(res).toEqual({ allowed: false, reason: 'no-stream' });
    expect(storage.presignedGetUrl).not.toHaveBeenCalled();
  });

  it('treats "demo" assets as playable', async () => {
    rights.canUserPlayTrack.mockResolvedValue({ allowed: true });
    prisma.track.findUniqueOrThrow.mockResolvedValue(trackWithAssets([asset(128, 'demo')]));
    const res = await service.authorize('t1');
    expect(res.allowed).toBe(true);
    expect(res.bitrate).toBe(128);
  });

  it('honours the PLAYBACK_URL_TTL_SECONDS env for the signed URL lifetime', async () => {
    const prev = process.env.PLAYBACK_URL_TTL_SECONDS;
    process.env.PLAYBACK_URL_TTL_SECONDS = '120';
    try {
      rights.canUserPlayTrack.mockResolvedValue({ allowed: true });
      prisma.track.findUniqueOrThrow.mockResolvedValue(trackWithAssets([asset(128)]));
      const res = await service.authorize('t1');
      expect(storage.presignedGetUrl).toHaveBeenCalledWith('k-128', 120);
      expect(res.expiresIn).toBe(120);
    } finally {
      if (prev === undefined) delete process.env.PLAYBACK_URL_TTL_SECONDS;
      else process.env.PLAYBACK_URL_TTL_SECONDS = prev;
    }
  });

  it('defaults to balanced (128) when no quality is given', async () => {
    rights.canUserPlayTrack.mockResolvedValue({ allowed: true });
    prisma.track.findUniqueOrThrow.mockResolvedValue(
      trackWithAssets([asset(64), asset(128), asset(320)]),
    );
    const res = await service.authorize('t1');
    expect(res.bitrate).toBe(128);
  });
});
