import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

export interface Scored {
  id: string;
  title: string;
  artist: { id: string; name: string };
  genre: string | null;
  verified: boolean;
  likes: number;
  score: number;
  reason: string;
}

/**
 * Explainable Phase 6 ranking: ~60% familiar (liked/played artists + genres)
 * and ~40% emerging African artists, with per-artist diversity caps.
 */
@Injectable()
export class RecommendationsService {
  constructor(private readonly prisma: PrismaService) {}

  async forYou(userId: string, take = 20) {
    const [likes, plays] = await Promise.all([
      this.prisma.like.findMany({
        where: { userId },
        include: { track: { include: { artist: true } } },
      }),
      this.prisma.listeningEvent.findMany({
        where: { userId, eventType: { in: ['play', 'complete', 'replay'] } },
        include: { track: { include: { artist: true } } },
        take: 200,
      }),
    ]);

    const likedIds = new Set(likes.map((l) => l.trackId));
    const artistWeight = new Map<string, number>();
    const genreWeight = new Map<string, number>();
    for (const l of likes) {
      artistWeight.set(l.track.artistId, (artistWeight.get(l.track.artistId) ?? 0) + 3);
      if (l.track.genre) genreWeight.set(l.track.genre, (genreWeight.get(l.track.genre) ?? 0) + 2);
    }
    for (const e of plays) {
      if (!e.track) continue;
      const w = e.eventType === 'complete' || e.eventType === 'replay' ? 1.5 : 0.5;
      artistWeight.set(e.track.artistId, (artistWeight.get(e.track.artistId) ?? 0) + w);
      if (e.track.genre) genreWeight.set(e.track.genre, (genreWeight.get(e.track.genre) ?? 0) + w * 0.5);
    }

    const candidates = await this.prisma.track.findMany({
      where: { status: 'active' },
      include: { artist: true, _count: { select: { likes: true } } },
      take: 500,
    });

    const familiar: Scored[] = [];
    const emerging: Scored[] = [];
    for (const t of candidates) {
      if (likedIds.has(t.id)) continue;
      const score =
        (artistWeight.get(t.artistId) ?? 0) + (t.genre ? (genreWeight.get(t.genre) ?? 0) : 0);
      const row = {
        id: t.id,
        title: t.title,
        artist: { id: t.artist.id, name: t.artist.name },
        genre: t.genre,
        verified: t.artist.verified,
        likes: t._count.likes,
        score,
        reason:
          (artistWeight.get(t.artistId) ?? 0) > 0
            ? `Because you listen to ${t.artist.name}`
            : 'Emerging African sound',
      };
      if (!t.artist.verified && t._count.likes < 3) emerging.push(row);
      else familiar.push(row);
    }

    familiar.sort((a, b) => b.score - a.score || b.likes - a.likes);
    emerging.sort((a, b) => b.likes - a.likes);

    const familiarCount = Math.round(take * 0.6);
    const picks: Scored[] = [];
    const perArtist = new Map<string, number>();
    const push = (row: Scored) => {
      const n = perArtist.get(row.artist.id) ?? 0;
      if (n >= 2) return;
      perArtist.set(row.artist.id, n + 1);
      picks.push(row);
    };
    familiar.slice(0, familiarCount * 2).forEach(push);
    for (const row of emerging) {
      if (picks.length >= take) break;
      push(row);
    }
    for (const row of familiar) {
      if (picks.length >= take) break;
      if (!picks.includes(row)) push(row);
    }
    return picks.slice(0, take);
  }
}
