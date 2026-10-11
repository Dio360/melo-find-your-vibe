import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { expandSearchTerms } from './search-synonyms.js';

export interface SearchHit {
  type: 'track' | 'artist' | 'album' | 'playlist' | 'vibe';
  id: string;
  title: string;
  subtitle: string | null;
  score: number;
  /** Real cover art (album cover / artist photo) when the catalogue has one. */
  image?: string | null;
}

const LIMIT = 8;

/**
 * Multi-entity search (Phase 4) backed by PostgreSQL pg_trgm:
 * exact + prefix matches rank first, typo-tolerant similarity fills the rest.
 *
 * PRD §15: queries are expanded to synonyms / alternative spellings / artist
 * aliases (see search-synonyms.ts). Rows match if ANY variant matches, but the
 * score is computed against the user's ORIGINAL words — so a synonym widens
 * the net without letting a variant outrank a direct hit.
 */
@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(query: string, entity?: string): Promise<SearchHit[]> {
    const { primary, terms } = expandSearchTerms(query);
    if (primary.length < 2) return [];

    const wants = (t: string) => !entity || entity === t || entity === 'all';
    const jobs: Promise<SearchHit[]>[] = [];
    if (wants('track')) jobs.push(this.searchTracks(primary, terms));
    if (wants('artist')) jobs.push(this.searchArtists(primary, terms));
    if (wants('album')) jobs.push(this.searchAlbums(primary, terms));
    if (wants('playlist')) jobs.push(this.searchPlaylists(primary, terms));
    if (wants('vibe')) jobs.push(this.searchVibes(primary, terms));

    const grouped = await Promise.all(jobs);

    // A row can match several variants (e.g. "afro beats" and "afrobeats"):
    // keep one copy, scored by its best variant.
    const merged = new Map<string, SearchHit>();
    for (const hit of grouped.flat()) {
      const key = `${hit.type}:${hit.id}`;
      const existing = merged.get(key);
      if (!existing || hit.score > existing.score) merged.set(key, hit);
    }
    return [...merged.values()].sort((a, b) => b.score - a.score).slice(0, 25);
  }

  private searchTracks(primary: string, terms: string[]) {
    return this.prisma.$queryRaw<SearchHit[]>`
      SELECT t.id, t.title AS title, a.name AS subtitle,
        GREATEST(
          similarity(t.title, ${primary}), word_similarity(t.title, ${primary}),
          similarity(a.name, ${primary}), word_similarity(a.name, ${primary})
        ) AS score,
        'track' AS type,
        al.cover AS image
      FROM "Track" t
      JOIN "Artist" a ON a.id = t."artistId"
      LEFT JOIN "Album" al ON al.id = t."albumId"
      WHERE t.status = 'active'
        AND EXISTS (
          SELECT 1 FROM unnest(${terms}::text[]) AS v(term)
          WHERE t.title ILIKE '%' || v.term || '%'
             OR a.name ILIKE '%' || v.term || '%'
             OR t.genre ILIKE '%' || v.term || '%'
             OR t.region ILIKE '%' || v.term || '%'
             OR similarity(t.title, v.term) > 0.15
             OR word_similarity(t.title, v.term) > 0.3
             OR similarity(a.name, v.term) > 0.15
             OR word_similarity(a.name, v.term) > 0.3)
      ORDER BY score DESC LIMIT ${LIMIT}`;
  }

  private searchArtists(primary: string, terms: string[]) {
    return this.prisma.$queryRaw<SearchHit[]>`
      SELECT a.id, a.name AS title, a.country AS subtitle,
        GREATEST(similarity(a.name, ${primary}), word_similarity(a.name, ${primary})) AS score,
        'artist' AS type,
        a.image AS image
      FROM "Artist" a
      WHERE a.status = 'active'
        AND EXISTS (
          SELECT 1 FROM unnest(${terms}::text[]) AS v(term)
          WHERE a.name ILIKE '%' || v.term || '%'
             OR similarity(a.name, v.term) > 0.15
             OR word_similarity(a.name, v.term) > 0.3)
      ORDER BY score DESC LIMIT ${LIMIT}`;
  }

  private searchAlbums(primary: string, terms: string[]) {
    return this.prisma.$queryRaw<SearchHit[]>`
      SELECT al.id, al.title AS title, ar.name AS subtitle,
        GREATEST(
          similarity(al.title, ${primary}), word_similarity(al.title, ${primary}),
          similarity(ar.name, ${primary}), word_similarity(ar.name, ${primary})
        ) AS score,
        'album' AS type,
        al.cover AS image
      FROM "Album" al JOIN "Artist" ar ON ar.id = al."artistId"
      WHERE al.status = 'active'
        AND EXISTS (
          SELECT 1 FROM unnest(${terms}::text[]) AS v(term)
          WHERE al.title ILIKE '%' || v.term || '%'
             OR ar.name ILIKE '%' || v.term || '%'
             OR similarity(al.title, v.term) > 0.15
             OR word_similarity(al.title, v.term) > 0.3
             OR similarity(ar.name, v.term) > 0.15
             OR word_similarity(ar.name, v.term) > 0.3)
      ORDER BY score DESC LIMIT ${LIMIT}`;
  }

  private searchPlaylists(primary: string, terms: string[]) {
    return this.prisma.$queryRaw<SearchHit[]>`
      SELECT p.id, p.name AS title, NULL AS subtitle,
        GREATEST(similarity(p.name, ${primary}), word_similarity(p.name, ${primary})) AS score,
        'playlist' AS type
      FROM "Playlist" p
      WHERE p.visibility = 'public'
        AND EXISTS (
          SELECT 1 FROM unnest(${terms}::text[]) AS v(term)
          WHERE p.name ILIKE '%' || v.term || '%'
             OR similarity(p.name, v.term) > 0.15
             OR word_similarity(p.name, v.term) > 0.3)
      ORDER BY score DESC LIMIT ${LIMIT}`;
  }

  private searchVibes(primary: string, terms: string[]) {
    return this.prisma.$queryRaw<SearchHit[]>`
      SELECT v.id, v.name AS title, v.category AS subtitle,
        GREATEST(similarity(v.name, ${primary}), word_similarity(v.name, ${primary})) AS score,
        'vibe' AS type
      FROM "Vibe" v
      WHERE v.active = true
        AND EXISTS (
          SELECT 1 FROM unnest(${terms}::text[]) AS w(term)
          WHERE v.name ILIKE '%' || w.term || '%'
             OR similarity(v.name, w.term) > 0.15
             OR word_similarity(v.name, w.term) > 0.3)
      ORDER BY score DESC LIMIT ${LIMIT}`;
  }
}
