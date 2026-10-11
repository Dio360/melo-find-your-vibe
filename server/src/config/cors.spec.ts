import { describe, it, expect } from 'vitest';
import { resolveCorsOrigins } from './cors.js';

describe('resolveCorsOrigins', () => {
  it('defaults to the local dev server outside production', () => {
    expect(resolveCorsOrigins({})).toEqual(['http://localhost:3000', 'http://127.0.0.1:3000']);
  });

  it('parses a comma-separated allowlist and trims whitespace', () => {
    const env = { CORS_ORIGINS: ' https://melo.app , https://www.melo.app ' };
    expect(resolveCorsOrigins(env)).toEqual(['https://melo.app', 'https://www.melo.app']);
  });

  it('deduplicates entries', () => {
    const env = { CORS_ORIGINS: 'https://melo.app,https://melo.app' };
    expect(resolveCorsOrigins(env)).toEqual(['https://melo.app']);
  });

  it('refuses to boot in production without an explicit allowlist', () => {
    expect(() => resolveCorsOrigins({ NODE_ENV: 'production' })).toThrow(/CORS_ORIGINS is required/);
  });

  it('accepts an explicit allowlist in production', () => {
    const env = { NODE_ENV: 'production', CORS_ORIGINS: 'https://melo.app' };
    expect(resolveCorsOrigins(env)).toEqual(['https://melo.app']);
  });

  it('rejects origins with a trailing slash or path', () => {
    expect(() => resolveCorsOrigins({ CORS_ORIGINS: 'https://melo.app/' })).toThrow(
      /not a valid origin/,
    );
    expect(() => resolveCorsOrigins({ CORS_ORIGINS: 'https://melo.app/app' })).toThrow(
      /not a valid origin/,
    );
  });

  it('rejects entries without a scheme', () => {
    expect(() => resolveCorsOrigins({ CORS_ORIGINS: 'melo.app' })).toThrow(/not a valid origin/);
  });

  it('rejects an allowlist that parses to nothing', () => {
    expect(() => resolveCorsOrigins({ CORS_ORIGINS: ' ,  ' })).toThrow(/empty allowlist/);
  });
});
