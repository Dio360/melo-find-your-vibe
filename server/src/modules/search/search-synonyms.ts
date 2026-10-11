/**
 * Search term expansion — PRD §15 SEARCH (synonyms, common alternative
 * spellings, artist aliases).
 *
 * Pure and I/O-free so it stays unit-testable. The catalogue-backed half of
 * alias resolution (fuzzy artist lookup) lives in SearchService; this file
 * only holds the static spelling/synonym knowledge.
 *
 * Why this earns its place: PostgreSQL ILIKE is literal, so "afro beats" never
 * matches the genre string "Afrobeats" and "hip hop" never matches "hiphop".
 * Expansion widens the net to those variants; the caller still scores against
 * the user's original words so exact matches keep ranking first.
 */

// Interchangeable spellings grouped by canonical concept. Members are stored
// as humans type them; matching happens on the normalized form.
const SYNONYM_GROUPS: string[][] = [
  ['afrobeats', 'afro beats', 'afro-beats', 'afrobeat'],
  ['amapiano', 'ama piano', 'ama-piano'],
  ['highlife', 'high life'],
  ['hiphop', 'hip hop', 'hip-hop'],
  ['rnb', 'r & b', 'r and b', "r'n'b"],
  ['naija', 'nigeria', 'nigerian'],
  ['alte', 'alté'],
];

// Artist nicknames/aliases → canonical catalogue name. Only spellings that do
// NOT already substring-match the real name are worth listing (ILIKE would
// find those on its own). Seed set — extend from real fan usage.
const ARTIST_ALIASES: Record<string, string> = {
  wizzy: 'wizkid',
  starboy: 'wizkid',
  obo: 'davido',
};

// Upper bound on terms sent to SQL per entity per query.
const MAX_TERMS = 6;

export interface ExpandedQuery {
  /** The user's words, normalized — use this for scoring/ranking. */
  primary: string;
  /** primary + synonym/alias variants — use this for match widening. */
  terms: string[];
}

/** Lowercase, strip diacritics (alté → alte), unify separators, collapse space. */
function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[_\-/]+/g, ' ')
    .replace(/&/g, ' and ')
    .replace(/'/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Normalize and expand a raw user query. `terms[0]` is always `primary`. */
export function expandSearchTerms(query: string): ExpandedQuery {
  const primary = normalize(query);
  if (!primary) return { primary: '', terms: [] };

  const terms = new Set<string>([primary]);

  for (const [alias, canonical] of Object.entries(ARTIST_ALIASES)) {
    if (primary === alias || primary.includes(alias)) terms.add(normalize(canonical));
  }

  for (const group of SYNONYM_GROUPS) {
    const members = group.map(normalize);
    if (members.some((member) => member && (primary === member || primary.includes(member)))) {
      for (const member of members) if (member) terms.add(member);
    }
  }

  return { primary, terms: [...terms].slice(0, MAX_TERMS) };
}
