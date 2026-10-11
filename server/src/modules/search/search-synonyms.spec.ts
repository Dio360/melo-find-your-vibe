import { describe, it, expect } from 'vitest';
import { expandSearchTerms } from './search-synonyms.js';

describe('expandSearchTerms', () => {
  it('returns empty for a blank query', () => {
    expect(expandSearchTerms('   ')).toEqual({ primary: '', terms: [] });
  });

  it('keeps a plain query as its own single term', () => {
    const { primary, terms } = expandSearchTerms('last last');
    expect(primary).toBe('last last');
    expect(terms).toEqual(['last last']);
  });

  it('normalizes case, spacing and hyphenation', () => {
    expect(expandSearchTerms('  Afro-Beats  ').primary).toBe('afro beats');
  });

  it('folds diacritics so alté matches alte', () => {
    expect(expandSearchTerms('alté').primary).toBe('alte');
  });

  it('expands afrobeats spelling variants', () => {
    const { terms } = expandSearchTerms('afro beats');
    expect(terms).toContain('afrobeats');
    expect(terms).toContain('afrobeat');
  });

  it('expands amapiano spelling variants', () => {
    const { terms } = expandSearchTerms('ama-piano');
    expect(terms).toContain('amapiano');
  });

  it('expands naija to nigeria and nigerian', () => {
    const { terms } = expandSearchTerms('naija');
    expect(terms).toContain('nigeria');
    expect(terms).toContain('nigerian');
  });

  it('expands r&b spelling variants', () => {
    const { terms } = expandSearchTerms('r&b');
    expect(terms).toContain('rnb');
    expect(terms).toContain('r and b');
  });

  it('resolves artist aliases to the canonical name', () => {
    const { terms } = expandSearchTerms('wizzy');
    expect(terms).toContain('wizkid');
  });

  it('resolves starboy to wizkid', () => {
    expect(expandSearchTerms('starboy').terms).toContain('wizkid');
  });

  it('leaves the primary query untouched by aliases', () => {
    const { primary } = expandSearchTerms('wizzy');
    expect(primary).toBe('wizzy');
  });

  it('always puts the primary term first', () => {
    const { primary, terms } = expandSearchTerms('naija chill');
    expect(terms[0]).toBe(primary);
  });

  it('does not expand an unrelated query', () => {
    const { terms } = expandSearchTerms('sungba remix');
    expect(terms).toEqual(['sungba remix']);
  });

  it('caps the number of terms', () => {
    const { terms } = expandSearchTerms('afro beats hip hop r&b naija alte amapiano');
    expect(terms.length).toBeLessThanOrEqual(6);
  });

  it('matches a synonym inside a longer phrase', () => {
    const { terms } = expandSearchTerms('chill afrobeats for lagos');
    expect(terms).toContain('afro beats');
  });
});
