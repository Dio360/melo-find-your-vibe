import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IntentParserService } from './intent-parser.service.js';
import type { PrismaService } from '../../prisma/prisma.service.js';

describe('IntentParserService (rule-based)', () => {
  let service: IntentParserService;
  let prisma: { artist: { findMany: ReturnType<typeof vi.fn> } };

  beforeEach(() => {
    prisma = { artist: { findMany: vi.fn().mockResolvedValue([]) } };
    service = new IntentParserService(prisma as unknown as PrismaService);
  });

  it('extracts moods', async () => {
    const intent = await service.parse('something calm and soulful');
    expect(intent.mood).toContain('calm');
    expect(intent.mood).toContain('soulful');
  });

  it('maps activity keywords to canonical activities and dedupes them', async () => {
    // "studying" and "reading" both canonicalize to "study".
    const intent = await service.parse('music for studying and reading');
    expect(intent.activity).toEqual(['study']);
  });

  it('canonicalizes genres to display names', async () => {
    const intent = await service.parse('play some afrobeats and amapiano');
    expect(intent.genre).toEqual(expect.arrayContaining(['Afrobeats', 'Amapiano']));
  });

  it('canonicalizes regions and languages', async () => {
    const intent = await service.parse('nigerian yoruba songs from lagos');
    expect(intent.region).toContain('Nigeria');
    expect(intent.language).toContain('Yoruba');
  });

  it('derives high energy from workout/party cues', async () => {
    const intent = await service.parse('high energy workout mix');
    expect(intent.energy).toBe('high');
  });

  it('derives low energy from calm/study cues', async () => {
    const intent = await service.parse('calm soft music for study');
    expect(intent.energy).toBe('low');
  });

  it('raises discovery_level for discovery cues', async () => {
    const intent = await service.parse('introduce me to emerging new artists');
    expect(intent.discovery_level).toBe('high');
  });

  it('lowers discovery_level for familiarity cues', async () => {
    const intent = await service.parse('just the popular hits and classics');
    expect(intent.discovery_level).toBe('low');
  });

  it('captures an explicit preference', async () => {
    const clean = await service.parse('clean music for the family');
    expect(clean.explicit_preference).toBe('clean');
    const explicit = await service.parse('give me the explicit version');
    expect(explicit.explicit_preference).toBe('explicit');
  });

  it('parses a requested track count', async () => {
    // The count regex needs the number adjacent to "song"/"track".
    const intent = await service.parse('give me 5 songs');
    expect(intent.count).toBe(5);
  });

  it('clamps a large requested track count to 30', async () => {
    const big = await service.parse('give me 99 songs');
    expect(big.count).toBe(30); // capped at 30
  });

  it('resolves artist references strictly against the live catalogue', async () => {
    prisma.artist.findMany.mockResolvedValue([{ name: 'Burna Boy' }, { name: 'Tems' }]);
    const intent = await service.parse('something like Burna Boy but not Wizkid');
    // Burna Boy is in the catalogue and mentioned; Wizkid is NOT in the catalogue
    // list we returned, so it must not surface as a reference.
    expect(intent.artist_reference).toEqual(['Burna Boy']);
    expect(intent.artist_reference).not.toContain('Wizkid');
  });

  it('returns an empty-but-typed intent for an unrecognised prompt', async () => {
    const intent = await service.parse('zzzz qqqq');
    expect(intent.mood).toEqual([]);
    expect(intent.genre).toEqual([]);
    expect(intent.artist_reference).toEqual([]);
    expect(intent.energy).toBe('medium');
    expect(intent.discovery_level).toBe('medium');
    expect(intent.count).toBeUndefined();
  });
});
