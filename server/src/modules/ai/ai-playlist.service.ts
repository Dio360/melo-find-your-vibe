import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RightsService } from '../playback/rights.service.js';
import { IntentParserService, type MusicIntent } from './intent-parser.service.js';

export interface GeneratedPlaylist {
  playlist: {
    id: string;
    name: string;
    description: string | null;
    tracks: {
      position: number;
      track: { id: string; title: string; duration: number; artist: { name: string } };
    }[];
  };
  intent: MusicIntent;
  explanation: string;
  fallback: boolean;
}

/**
 * Grounded playlist generator (Phase 7).
 * Candidates come ONLY from catalogue rows — the generator can never
 * invent a track, satisfying the AI safety rule by construction.
 */
@Injectable()
export class AiPlaylistService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly parser: IntentParserService,
    private readonly rights: RightsService,
  ) {}

  async interpret(prompt: string): Promise<MusicIntent> {
    return this.parser.parse(prompt);
  }

  async generate(userId: string, prompt: string, name?: string, count = 20): Promise<GeneratedPlaylist> {
    const intent = await this.parser.parse(prompt);
    const take = Math.min(Math.max(count, 1), 30);
    const hasSignal =
      intent.mood.length +
        intent.activity.length +
        intent.genre.length +
        intent.artist_reference.length +
        intent.region.length +
        intent.language.length >
      0;

    const artistIds = await this.resolveArtists(intent.artist_reference);
    const candidates = await this.prisma.track.findMany({
      where: {
        status: 'active',
        ...(intent.genre.length > 0 ? { genre: { in: intent.genre } } : {}),
        ...(intent.region.length > 0 ? { region: { in: intent.region } } : {}),
        ...(intent.language.length > 0 ? { language: { in: intent.language } } : {}),
        ...(intent.explicit_preference === 'clean' ? { explicit: false } : {}),
      },
      include: { artist: true, _count: { select: { likes: true } } },
      take: 200,
    });

    const scored = candidates.map((t) => {
      let score = 0;
      if (intent.genre.includes(t.genre ?? '')) score += 3;
      if (intent.region.includes(t.region ?? '')) score += 2;
      if (intent.language.includes(t.language ?? '')) score += 1;
      if (artistIds.includes(t.artistId)) score += 6;
      if (intent.discovery_level === 'high' && !t.artist.verified) score += 2;
      return { track: t, score };
    });
    scored.sort((a, b) => b.score - a.score || b.track._count.likes - a.track._count.likes);

    // Diversity cap + rights gate, preserving rank order.
    const picked: typeof scored = [];
    const perArtist = new Map<string, number>();
    for (const row of scored) {
      if (picked.length >= take) break;
      const n = perArtist.get(row.track.artistId) ?? 0;
      if (n >= 2) continue;
      const decision = await this.rights.canUserPlayTrack(row.track.id, 'NG');
      if (!decision.allowed) continue;
      perArtist.set(row.track.artistId, n + 1);
      picked.push(row);
    }

    if (!hasSignal || picked.length === 0) {
      const fallbackPicks = await this.popularLicensed(take);
      return this.persist(
        userId,
        prompt,
        intent,
        fallbackPicks,
        "I couldn't find an exact match, but these are close to the vibe you're describing.",
        true,
        name,
      );
    }

    return this.persist(
      userId,
      prompt,
      intent,
      picked,
      this.explain(intent, picked.length),
      false,
      name,
    );
  }

  private async popularLicensed(take: number) {
    const popular = await this.prisma.track.findMany({
      where: { status: 'active' },
      include: { artist: true },
      orderBy: { likes: { _count: 'desc' } },
      take: take * 3,
    });
    const picks: { track: (typeof popular)[number]; score: number }[] = [];
    const perArtist = new Map<string, number>();
    for (const t of popular) {
      if (picks.length >= take) break;
      const n = perArtist.get(t.artistId) ?? 0;
      if (n >= 2) continue;
      const decision = await this.rights.canUserPlayTrack(t.id, 'NG');
      if (!decision.allowed) continue;
      perArtist.set(t.artistId, n + 1);
      picks.push({ track: t, score: 0 });
    }
    return picks;
  }

  private async persist(
    userId: string,
    prompt: string,
    intent: MusicIntent,
    picked: Array<{ track: { id: string } }>,
    explanation: string,
    fallback: boolean,
    name?: string,
  ): Promise<GeneratedPlaylist> {
    const playlist = await this.prisma.playlist.create({
      data: {
        ownerId: userId,
        name: name?.trim() || `Vibe: ${prompt.slice(0, 40)}`,
        description: explanation,
      },
    });
    await this.prisma.playlistTrack.createMany({
      data: picked.map((row, position) => ({
        playlistId: playlist.id,
        trackId: row.track.id,
        position,
      })),
    });

    // Quality-analysis log (PRD §19).
    await this.prisma.aiRequest.create({
      data: {
        userId,
        prompt: prompt.slice(0, 500),
        intent: JSON.stringify(intent),
        resultCount: picked.length,
      },
    });

    const detail = await this.prisma.playlist.findUniqueOrThrow({
      where: { id: playlist.id },
      include: {
        tracks: {
          orderBy: { position: 'asc' },
          include: { track: { include: { artist: { select: { name: true } } } } },
        },
      },
    });

    return {
      playlist: {
        id: detail.id,
        name: detail.name,
        description: detail.description,
        tracks: detail.tracks.map((pt) => ({
          position: pt.position,
          track: {
            id: pt.track.id,
            title: pt.track.title,
            duration: pt.track.duration,
            artist: { name: pt.track.artist.name },
          },
        })),
      },
      intent,
      explanation,
      fallback,
    };
  }

  private async resolveArtists(names: string[]): Promise<string[]> {
    if (names.length === 0) return [];
    const artists = await this.prisma.artist.findMany({
      where: { name: { in: names } },
      select: { id: true },
    });
    return artists.map((a) => a.id);
  }

  private explain(intent: MusicIntent, count: number): string {
    const bits: string[] = [];
    if (intent.mood.length > 0) bits.push(intent.mood.join(', '));
    if (intent.genre.length > 0) bits.push(intent.genre.join(', '));
    if (intent.activity.length > 0) bits.push(`for ${intent.activity.join(', ')}`);
    if (intent.artist_reference.length > 0) bits.push(`inspired by ${intent.artist_reference.join(', ')}`);
    const vibe = bits.length > 0 ? bits.join(' ') : 'your vibe';
    return `${count} licensed tracks matching ${vibe}, ranked for discovery.`;
  }
}
