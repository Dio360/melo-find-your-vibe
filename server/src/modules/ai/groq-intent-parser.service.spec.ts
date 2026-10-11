import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GroqIntentParserService } from './groq-intent-parser.service.js';
import type { PrismaService } from '../../prisma/prisma.service.js';

// Build a fake Groq chat-completion response from a JSON content string.
function groqResponse(content: string) {
  return {
    ok: true,
    json: async () => ({ choices: [{ message: { content } }] }),
  };
}

describe('GroqIntentParserService', () => {
  let prisma: { artist: { findMany: ReturnType<typeof vi.fn> } };
  let fetchMock: ReturnType<typeof vi.fn>;
  const realFetch = globalThis.fetch;
  const realKey = process.env.GROQ_API_KEY;

  beforeEach(() => {
    prisma = { artist: { findMany: vi.fn() } };
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = realFetch;
    if (realKey === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = realKey;
    vi.restoreAllMocks();
  });

  function svc() {
    return new GroqIntentParserService(prisma as unknown as PrismaService);
  }

  it('falls straight back to the rule parser when no API key is configured', async () => {
    delete process.env.GROQ_API_KEY;
    prisma.artist.findMany.mockResolvedValue([]);
    const intent = await svc().parse('calm amapiano for studying');
    // Rule parser output: activity "study", genre "Amapiano", energy low.
    expect(fetchMock).not.toHaveBeenCalled();
    expect(intent.genre).toContain('Amapiano');
    expect(intent.activity).toContain('study');
    expect(intent.energy).toBe('low');
  });

  it('sanitizes hallucinated values out of the model output', async () => {
    process.env.GROQ_API_KEY = 'test-key';
    prisma.artist.findMany.mockResolvedValue([{ name: 'Burna Boy' }]);
    // Model invents moods/genres/regions/energy/artists not in the vocab or catalogue.
    fetchMock.mockResolvedValue(
      groqResponse(
        JSON.stringify({
          mood: ['calm', 'ethereal', 'vibesicle'], // only "calm" is canonical
          activity: ['study'],
          energy: 'hyper', // invalid → medium
          genre: ['Afrobeats', 'K-Pop'], // only Afrobeats is canonical
          artist_reference: ['Burna Boy', 'DJ Khaled'], // Khaled not in catalogue
          language: ['Yoruba', 'Klingon'], // Klingon not canonical
          region: ['Nigeria', 'Atlantis'], // Atlantis not canonical
          explicit_preference: 'maybe', // invalid → undefined
          discovery_level: 'extreme', // invalid → medium
          count: 5,
        }),
      ),
    );

    const intent = await svc().parse('anything');
    expect(intent.mood).toEqual(['calm']);
    expect(intent.energy).toBe('medium');
    expect(intent.genre).toEqual(['Afrobeats']);
    expect(intent.artist_reference).toEqual(['Burna Boy']); // Khaled stripped
    expect(intent.language).toEqual(['Yoruba']);
    expect(intent.region).toEqual(['Nigeria']);
    expect(intent.explicit_preference).toBeUndefined();
    expect(intent.discovery_level).toBe('medium');
    expect(intent.count).toBe(5);
  });

  it('canonicalizes alias spellings from the model', async () => {
    process.env.GROQ_API_KEY = 'test-key';
    prisma.artist.findMany.mockResolvedValue([]);
    fetchMock.mockResolvedValue(
      groqResponse(
        JSON.stringify({
          mood: [],
          activity: ['studying'], // alias → "study"
          energy: 'low',
          genre: ['afrobeats'], // lowercase alias → "Afrobeats"
          artist_reference: [],
          language: [],
          region: ['naija'], // alias → "Nigeria"
          discovery_level: 'low',
          context: [],
          count: null,
        }),
      ),
    );
    const intent = await svc().parse('anything');
    expect(intent.activity).toEqual(['study']);
    expect(intent.genre).toEqual(['Afrobeats']);
    expect(intent.region).toEqual(['Nigeria']);
  });

  it('clamps an out-of-range count', async () => {
    process.env.GROQ_API_KEY = 'test-key';
    prisma.artist.findMany.mockResolvedValue([]);
    fetchMock.mockResolvedValue(
      groqResponse(JSON.stringify({ count: 500, mood: [], activity: [], genre: [], artist_reference: [], language: [], region: [], context: [] })),
    );
    const intent = await svc().parse('anything');
    expect(intent.count).toBe(30);
  });

  it('dedupes repeated canonical values', async () => {
    process.env.GROQ_API_KEY = 'test-key';
    prisma.artist.findMany.mockResolvedValue([]);
    fetchMock.mockResolvedValue(
      groqResponse(JSON.stringify({ mood: ['calm', 'calm', 'calm'], activity: [], genre: [], artist_reference: [], language: [], region: [], context: [] })),
    );
    const intent = await svc().parse('anything');
    expect(intent.mood).toEqual(['calm']);
  });

  it('falls back to rules when the model returns non-JSON', async () => {
    process.env.GROQ_API_KEY = 'test-key';
    prisma.artist.findMany.mockResolvedValue([]);
    fetchMock.mockResolvedValue(groqResponse('Sorry, I cannot help with that.'));
    const intent = await svc().parse('calm music for studying');
    expect(intent.activity).toContain('study'); // rule-derived, not model
    expect(intent.energy).toBe('low');
  });

  it('falls back to rules when the API returns a non-OK status', async () => {
    process.env.GROQ_API_KEY = 'test-key';
    prisma.artist.findMany.mockResolvedValue([]);
    fetchMock.mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });
    const intent = await svc().parse('energetic party afrobeats');
    expect(intent.energy).toBe('high');
    expect(intent.genre).toContain('Afrobeats');
  });

  it('falls back to rules when the network call itself rejects', async () => {
    process.env.GROQ_API_KEY = 'test-key';
    prisma.artist.findMany.mockResolvedValue([]);
    fetchMock.mockRejectedValue(new Error('network down'));
    const intent = await svc().parse('calm gospel for sleep');
    expect(intent.genre).toContain('Gospel');
    expect(intent.energy).toBe('low');
  });
});
