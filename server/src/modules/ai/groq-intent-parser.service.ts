import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  INTENT_ALIASES,
  INTENT_VOCAB,
  IntentParser,
  IntentParserService,
  type MusicIntent,
} from './intent-parser.service.js';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = process.env.GROQ_MODEL ?? 'openai/gpt-oss-120b';

const SYSTEM_PROMPT = `You extract structured music intent from a listener request for Melo, an African music discovery app.
Respond with ONLY a JSON object, no other text. Schema:
{"mood": string[], "activity": string[], "energy": "low"|"medium"|"high", "genre": string[], "artist_reference": string[], "language": string[], "region": string[], "explicit_preference": "clean"|"explicit"|null, "discovery_level": "low"|"medium"|"high", "context": string[], "count": number|null}
Rules: list only values stated or strongly implied; artist_reference holds artist names exactly as written; count only when the request names a number of songs; empty arrays when nothing applies.`;

/**
 * Groq LLM intent parser (Phase 7+). Output is sanitized against the
 * canonical vocabulary and live catalogue artists, so the safety rule
 * holds even when the model drifts. Any failure falls back to rules.
 */
@Injectable()
export class GroqIntentParserService implements IntentParser {
  private readonly logger = new Logger(GroqIntentParserService.name);
  private readonly rules: IntentParserService;

  constructor(private readonly prisma: PrismaService) {
    this.rules = new IntentParserService(this.prisma);
  }

  async parse(prompt: string): Promise<MusicIntent> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return this.rules.parse(prompt);

    try {
      const res = await fetch(GROQ_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: DEFAULT_MODEL,
          temperature: 0,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: prompt.slice(0, 500) },
          ],
        }),
      });
      if (!res.ok) throw new Error(`Groq ${res.status}`);
      const body = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const raw = body.choices?.[0]?.message?.content ?? '{}';
      return await this.sanitize(JSON.parse(raw));
    } catch (err) {
      this.logger.warn(`Groq parse failed, using rules: ${(err as Error).message}`);
      return this.rules.parse(prompt);
    }
  }

  private async sanitize(raw: Record<string, unknown>): Promise<MusicIntent> {
    const pick = (key: keyof typeof INTENT_VOCAB): string[] => {
      const values = Array.isArray(raw[key]) ? (raw[key] as unknown[]) : [];
      const allowed = new Set(INTENT_VOCAB[key]);
      const aliases = INTENT_ALIASES[key];
      const canonical = values
        .filter((v): v is string => typeof v === 'string')
        .map((v) => (allowed.has(v) ? v : aliases[v.toLowerCase()] ?? ''))
        .filter((v) => v !== '');
      return [...new Set(canonical)];
    };
    const artists = await this.prisma.artist.findMany({ select: { name: true } });
    const known = new Set(artists.map((a) => a.name.toLowerCase()));
    const artist_reference = Array.isArray(raw.artist_reference)
      ? [...new Set(
          (raw.artist_reference as unknown[])
            .filter((v): v is string => typeof v === 'string')
            .filter((v) => known.has(v.toLowerCase()))
            .map((v) => artists.find((a) => a.name.toLowerCase() === v.toLowerCase())!.name),
        )]
      : [];

    const energy = raw.energy === 'low' || raw.energy === 'high' ? raw.energy : 'medium';
    const discovery_level =
      raw.discovery_level === 'low' || raw.discovery_level === 'high' ? raw.discovery_level : 'medium';
    const count =
      typeof raw.count === 'number' ? Math.min(Math.max(Math.floor(raw.count), 1), 30) : undefined;

    return {
      mood: pick('mood'),
      activity: pick('activity'),
      energy,
      genre: pick('genre'),
      artist_reference,
      language: pick('language'),
      region: pick('region'),
      explicit_preference: raw.explicit_preference === 'clean' || raw.explicit_preference === 'explicit'
        ? raw.explicit_preference
        : undefined,
      discovery_level,
      context: [...pick('mood'), ...pick('activity')],
      count,
    };
  }
}
