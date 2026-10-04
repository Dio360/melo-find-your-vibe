// Shared vibe + cover helpers (used by home, vibes, search, ai pages).

export const VIBE_FILTERS: Record<string, { genre?: string; region?: string }> = {
  'Naija Chill': { region: 'Nigeria' },
  'Lagos Night Drive': { genre: 'Afrobeats' },
  'Afrobeat Energy': { genre: 'Afrobeats' },
  'Late Night Study': {},
  'Amapiano Grooves': { genre: 'Amapiano' },
  'Sunday Morning': {},
  'Highlife Classics': { genre: 'Highlife' },
};

export function fmtDuration(total: number): string {
  if (!Number.isFinite(total) || total <= 0) return '';
  const m = Math.floor(total / 60);
  const s = Math.floor(total % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

const PALETTE = ['#1DB95D', '#FF5722', '#E8DCC8', '#00E5FF', '#FF9800', '#E91E63'];

export function glowFor(index: number): string {
  return PALETTE[index % PALETTE.length]!;
}

// Offline-safe cover art: gradient tile with the artist initial (no external images).
export function coverFor(id: string, artist: string, color: string): string {
  void id;
  const initial = (artist.charAt(0) || 'M').toUpperCase();
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='500' height='500'>` +
    `<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>` +
    `<stop offset='0' stop-color='${color}' stop-opacity='0.85'/>` +
    `<stop offset='1' stop-color='#141414'/></linearGradient></defs>` +
    `<rect width='500' height='500' fill='url(#g)'/>` +
    `<text x='50%' y='58%' font-size='200' text-anchor='middle' ` +
    `fill='rgba(255,255,255,0.9)' font-family='sans-serif' font-weight='bold'>${initial}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
