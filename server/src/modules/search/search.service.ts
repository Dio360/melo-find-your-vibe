import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

export interface SearchHit {
  type: 'track' | 'artist' | 'album' | 'playlist' | 'vibe';
  id: string;
  title: string;
  subtitle: string | null;
  score: number;
}

const LIMIT = 8;

/**
 * Multi-entity search (Phase 4) backed by PostgreSQL pg_trgm:
 * exact + prefix matches rank first, typo-tolerant similarity fills the rest.
 */
@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(query: string, entity?: string): Promise<SearchHit[]> {
    const q = query.trim();
    if (q.length < 2) return [];

    const wants = (t: string) => !entity || entity === t || entity === 'all';
    const jobs: Promise<SearchHit[]>[] = [];
    if (wants('track')) jobs.push(this.searchTracks(q));
    if (wants('artist')) jobs.push(this.searchArtists(q));
    if (wants('album')) jobs.push(this.searchAlbums(q));
    if (wants('playlist')) jobs.push(this.searchPlaylists(q));
    if (wants('vibe')) jobs.push(this.searchVibes(q));

    const grouped = await Promise.all(jobs);
    return grouped.flat().sort((a, b) => b.score - a.score).slice(0, 25);
  }

  private searchTracks(q: string) {
    return this.prisma.$queryRaw<SearchHit[]>`
      SELECT t.id, t.title AS title, a.name AS subtitle,
        GREATEST(similarity(t.title, ${q}), word_similarity(t.title, ${q})) AS score,
        'track' AS type
      FROM "Track" t JOIN "Artist" a ON a.id = t."artistId"
      WHERE t.status = 'active'
        AND (t.title ILIKE '%' || ${q} || '%'
          OR similarity(t.title, ${q}) > 0.15
          OR word_similarity(t.title, ${q}) > 0.3)
      ORDER BY score DESC LIMIT ${LIMIT}`;
  }

  private searchArtists(q: string) {
    return this.prisma.$queryRaw<SearchHit[]>`
      SELECT a.id, a.name AS title, a.country AS subtitle,
        GREATEST(similarity(a.name, ${q}), word_similarity(a.name, ${q})) AS score,
        'artist' AS type
      FROM "Artist" a
      WHERE a.status = 'active'
        AND (a.name ILIKE '%' || ${q} || '%'
          OR similarity(a.name, ${q}) > 0.15
          OR word_similarity(a.name, ${q}) > 0.3)
      ORDER BY score DESC LIMIT ${LIMIT}`;
  }

  private searchAlbums(q: string) {
    return this.prisma.$queryRaw<SearchHit[]>`
      SELECT al.id, al.title AS title, ar.name AS subtitle,
        GREATEST(similarity(al.title, ${q}), word_similarity(al.title, ${q})) AS score,
        'album' AS type
      FROM "Album" al JOIN "Artist" ar ON ar.id = al."artistId"
      WHERE al.status = 'active'
        AND (al.title ILIKE '%' || ${q} || '%'
          OR similarity(al.title, ${q}) > 0.15
          OR word_similarity(al.title, ${q}) > 0.3)
      ORDER BY score DESC LIMIT ${LIMIT}`;
  }

  private searchPlaylists(q: string) {
    return this.prisma.$queryRaw<SearchHit[]>`
      SELECT p.id, p.name AS title, NULL AS subtitle,
        GREATEST(similarity(p.name, ${q}), word_similarity(p.name, ${q})) AS score,
        'playlist' AS type
      FROM "Playlist" p
      WHERE p.visibility = 'public'
        AND (p.name ILIKE '%' || ${q} || '%'
          OR similarity(p.name, ${q}) > 0.15
          OR word_similarity(p.name, ${q}) > 0.3)
      ORDER BY score DESC LIMIT ${LIMIT}`;
  }

  private searchVibes(q: string) {
    return this.prisma.$queryRaw<SearchHit[]>`
      SELECT v.id, v.name AS title, v.category AS subtitle,
        GREATEST(similarity(v.name, ${q}), word_similarity(v.name, ${q})) AS score,
        'vibe' AS type
      FROM "Vibe" v
      WHERE v.active = true
        AND (v.name ILIKE '%' || ${q} || '%'
          OR similarity(v.name, ${q}) > 0.15
          OR word_similarity(v.name, ${q}) > 0.3)
      ORDER BY score DESC LIMIT ${LIMIT}`;
  }
}
