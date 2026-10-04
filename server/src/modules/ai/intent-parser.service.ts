import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

export interface MusicIntent {
  mood: string[];
  activity: string[];
  energy?: 'low' | 'medium' | 'high';
  genre: string[];
  artist_reference: string[];
  language: string[];
  region: string[];
  explicit_preference?: 'clean' | 'explicit';
  discovery_level: 'low' | 'medium' | 'high';
  context: string[];
  count?: number;
}

const MOODS = [
  'calm', 'happy', 'sad', 'romantic', 'energetic', 'chill', 'emotional',
  'nostalgic', 'peaceful', 'confident', 'party', 'soulful', 'hype',
];

const ACTIVITIES: Record<string, string> = {
  studying: 'study', study: 'study', reading: 'study', read: 'study',
  working: 'work', work: 'work', focus: 'work',
  workout: 'gym', gym: 'gym', exercise: 'gym', running: 'gym', run: 'gym',
  driving: 'drive', drive: 'drive', 'road trip': 'drive',
  party: 'party', club: 'party', dancing: 'party',
  sleeping: 'sleep', sleep: 'sleep',
  cooking: 'cook', cook: 'cook',
  relaxing: 'relax', relax: 'relax', chill: 'relax',
  travel: 'travel', travelling: 'travel', traveling: 'travel',
  date: 'date', wedding: 'date',
};

const GENRES: Record<string, string> = {
  afrobeats: 'Afrobeats', afrobeat: 'Afrobeats',
  amapiano: 'Amapiano', highlife: 'Highlife', afropop: 'Afropop',
  alte: 'Alté', fuji: 'Fuji-Fusion', afrorave: 'Afrorave',
  'hip hop': 'Hip Hop', hiphop: 'Hip Hop', rap: 'Hip Hop',
  'r&b': 'R&B', rnb: 'R&B', gospel: 'Gospel', soul: 'Soul',
};

const REGIONS: Record<string, string> = {
  naija: 'Nigeria', nigeria: 'Nigeria', nigerian: 'Nigeria',
  ghana: 'Ghana', ghanaian: 'Ghana',
  'south africa': 'South Africa', 'south african': 'South Africa',
  'west africa': 'West Africa', africa: 'Africa', african: 'Africa',
};

const LANGUAGES: Record<string, string> = {
  yoruba: 'Yoruba', igbo: 'Igbo', hausa: 'Hausa', pidgin: 'Pidgin', english: 'English',
};

/**
 * Rule-based intent parser (Phase 7 MVP).
 * Deterministic and explainable; satisfies the "never invent catalogue
 * information" rule by construction — artist references resolve against
 * live catalogue rows only. Swappable for an LLM behind this interface.
 */
@Injectable()
export class IntentParserService {
  constructor(private readonly prisma: PrismaService) {}

  async parse(prompt: string): Promise<MusicIntent> {
    const text = prompt.toLowerCase();
    const has = (...words: string[]) => words.some((w) => text.includes(w));

    const mood = MOODS.filter((m) => text.includes(m));
    const activity = [...new Set(
      Object.entries(ACTIVITIES).filter(([k]) => text.includes(k)).map(([, v]) => v),
    )];
    const genre = [...new Set(
      Object.entries(GENRES).filter(([k]) => text.includes(k)).map(([, v]) => v),
    )];
    const region = [...new Set(
      Object.entries(REGIONS).filter(([k]) => text.includes(k)).map(([, v]) => v),
    )];
    const language = [...new Set(
      Object.entries(LANGUAGES).filter(([k]) => text.includes(k)).map(([, v]) => v),
    )];

    let energy: MusicIntent['energy'] = 'medium';
    if (has('energetic', 'hype', 'high energy', 'upbeat', 'workout', 'gym', 'party')) energy = 'high';
    else if (has('calm', 'soft', 'chill', 'relax', 'low', 'sleep', 'study', 'peaceful')) energy = 'low';

    let discovery_level: MusicIntent['discovery_level'] = 'medium';
    if (has('introduce me', 'new artists', 'emerging', 'discover', "don't know", 'fresh', 'underground')) {
      discovery_level = 'high';
    } else if (has('familiar', 'hits', 'classics', 'popular', 'my favorite', 'my favourite')) {
      discovery_level = 'low';
    }

    const artists = await this.prisma.artist.findMany({ select: { name: true } });
    const artist_reference = artists
      .map((a) => a.name)
      .filter((name) => name.length >= 4 && text.includes(name.toLowerCase()));

    let explicit_preference: MusicIntent['explicit_preference'];
    if (has('clean', 'no explicit', 'family')) explicit_preference = 'clean';
    else if (has('explicit')) explicit_preference = 'explicit';

    const countMatch = text.match(/(\d{1,2})\s*(song|track)/);
    const count = countMatch ? Math.min(Math.max(Number(countMatch[1]), 1), 30) : undefined;

    const context = [...mood, ...activity];

    return {
      mood, activity, energy, genre, artist_reference, language, region,
      explicit_preference, discovery_level, context, count,
    };
  }
}
