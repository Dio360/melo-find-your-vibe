import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AiPlaylistService } from './ai-playlist.service.js';
import type { PrismaService } from '../../prisma/prisma.service.js';
import type { RightsService } from '../playback/rights.service.js';
import type { IntentParser, MusicIntent } from './intent-parser.service.js';

function intent(overrides: Partial<MusicIntent> = {}): MusicIntent {
  return {
    mood: ['calm'],
    activity: [],
    energy: 'low',
    genre: [],
    artist_reference: [],
    language: [],
    region: [],
    discovery_level: 'medium',
    context: ['calm'],
    ...overrides,
  };
}

function candidate(id: string, artistId: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    artistId,
    title: `Track ${id}`,
    duration: 180,
    genre: 'Afrobeats',
    region: 'Nigeria',
    language: 'English',
    explicit: false,
    status: 'active',
    artist: { name: `Artist ${artistId}`, verified: false },
    _count: { likes: 0 },
    ...overrides,
  };
}

describe('AiPlaylistService', () => {
  let service: AiPlaylistService;
  let parser: { parse: ReturnType<typeof vi.fn> };
  let rights: { canUserPlayTrack: ReturnType<typeof vi.fn> };
  let prisma: {
    artist: { findMany: ReturnType<typeof vi.fn> };
    track: { findMany: ReturnType<typeof vi.fn> };
    playlist: {
      create: ReturnType<typeof vi.fn>;
      findUniqueOrThrow: ReturnType<typeof vi.fn>;
    };
    playlistTrack: { createMany: ReturnType<typeof vi.fn> };
    aiRequest: { create: ReturnType<typeof vi.fn> };
  };

  beforeEach(() => {
    parser = { parse: vi.fn() };
    rights = { canUserPlayTrack: vi.fn() };
    prisma = {
      artist: { findMany: vi.fn().mockResolvedValue([]) },
      track: { findMany: vi.fn() },
      playlist: {
        create: vi.fn(),
        findUniqueOrThrow: vi.fn(),
      },
      playlistTrack: { createMany: vi.fn() },
      aiRequest: { create: vi.fn() },
    };
    service = new AiPlaylistService(
      prisma as unknown as PrismaService,
      parser as unknown as IntentParser,
      rights as unknown as RightsService,
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // Wire up the happy path: candidates returned, all licensed, playlist echoed back.
  function arrangeHappy(cands: unknown[]) {
    parser.parse.mockResolvedValue(intent());
    prisma.track.findMany.mockResolvedValue(cands);
    rights.canUserPlayTrack.mockResolvedValue({ allowed: true });
    prisma.playlist.create.mockResolvedValue({ id: 'pl1', name: 'Vibe', description: 'x' });
    prisma.playlistTrack.createMany.mockResolvedValue({ count: cands.length });
    // Echo back whatever tracks were persisted so the return shape is realistic.
    prisma.playlist.findUniqueOrThrow.mockImplementation(
      async ({ where }: { where: { id: string } }) => ({
        id: where.id,
        name: 'Vibe',
        description: 'x',
        tracks: (
          prisma.playlistTrack.createMany.mock.calls[0]?.[0]?.data ?? []
        ).map((row: { trackId: string; position: number }) => ({
          position: row.position,
          track: {
            id: row.trackId,
            title: `Track ${row.trackId}`,
            duration: 180,
            artist: { name: 'Artist' },
          },
        }),
      ),
    }));
  }

  it('only returns tracks that came from the catalogue candidates', async () => {
    arrangeHappy([candidate('a1', 'ar1'), candidate('a2', 'ar2')]);
    const res = await service.generate('u1', 'calm songs');
    expect(res.fallback).toBe(false);
    expect(res.playlist.tracks.map((t) => t.track.id)).toEqual(['a1', 'a2']);
  });

  it('persists the playlist, links tracks, and logs the AI request', async () => {
    arrangeHappy([candidate('a1', 'ar1')]);
    await service.generate('u1', 'calm songs', 'My Mix');
    expect(prisma.playlist.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ ownerId: 'u1', name: 'My Mix' }),
      }),
    );
    expect(prisma.playlistTrack.createMany).toHaveBeenCalled();
    expect(prisma.aiRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: 'u1', resultCount: expect.any(Number) }),
      }),
    );
  });

  it('applies the per-artist diversity cap of 2', async () => {
    // Three strong tracks from the SAME artist — only 2 should survive.
    arrangeHappy([
      candidate('a1', 'ar1'),
      candidate('a2', 'ar1'),
      candidate('a3', 'ar1'),
    ]);
    const res = await service.generate('u1', 'calm songs');
    expect(res.playlist.tracks).toHaveLength(2);
    expect(res.playlist.tracks.map((t) => t.track.id)).toEqual(['a1', 'a2']);
  });

  it('skips candidates that fail the rights gate', async () => {
    parser.parse.mockResolvedValue(intent());
    prisma.track.findMany.mockResolvedValue([
      candidate('a1', 'ar1'),
      candidate('a2', 'ar2'),
    ]);
    // a1 is not licensed; a2 is.
    rights.canUserPlayTrack.mockImplementation(async (id: string) =>
      id === 'a1' ? { allowed: false, reason: 'not-licensed' } : { allowed: true },
    );
    prisma.playlist.create.mockResolvedValue({ id: 'pl1', name: 'Vibe', description: 'x' });
    prisma.playlistTrack.createMany.mockResolvedValue({ count: 1 });
    prisma.playlist.findUniqueOrThrow.mockResolvedValue({
      id: 'pl1',
      name: 'Vibe',
      description: 'x',
      tracks: [
        { position: 0, track: { id: 'a2', title: 'Track a2', duration: 180, artist: { name: 'Artist' } } },
      ],
    });

    const res = await service.generate('u1', 'calm songs');
    expect(res.playlist.tracks.map((t) => t.track.id)).toEqual(['a2']);
  });

  it('returns a grounded fallback (still real, licensed tracks) when there is no signal', async () => {
    parser.parse.mockResolvedValue(intent({ mood: [], activity: [], genre: [], artist_reference: [], region: [], language: [] }));
    // popularLicensed path: findMany called again for popular tracks.
    prisma.track.findMany.mockResolvedValue([candidate('p1', 'ar9')]);
    rights.canUserPlayTrack.mockResolvedValue({ allowed: true });
    prisma.playlist.create.mockResolvedValue({ id: 'pl1', name: 'Vibe', description: 'x' });
    prisma.playlistTrack.createMany.mockResolvedValue({ count: 1 });
    prisma.playlist.findUniqueOrThrow.mockResolvedValue({
      id: 'pl1',
      name: 'Vibe',
      description: 'x',
      tracks: [
        { position: 0, track: { id: 'p1', title: 'Track p1', duration: 180, artist: { name: 'Artist' } } },
      ],
    });

    const res = await service.generate('u1', 'surprise me');
    expect(res.fallback).toBe(true);
    expect(res.playlist.tracks.map((t) => t.track.id)).toEqual(['p1']);
  });

  it('derives the parser name from env', () => {
    const prevKey = process.env.GROQ_API_KEY;
    const prevParser = process.env.AI_PARSER;
    try {
      process.env.AI_PARSER = 'rule';
      expect(service.parserName()).toBe('rule');
      delete process.env.GROQ_API_KEY;
      delete process.env.AI_PARSER;
      expect(service.parserName()).toBe('rule');
    } finally {
      if (prevKey !== undefined) process.env.GROQ_API_KEY = prevKey;
      if (prevParser !== undefined) process.env.AI_PARSER = prevParser;
    }
  });
});
