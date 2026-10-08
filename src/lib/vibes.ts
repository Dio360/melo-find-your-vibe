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

// Real cover photos (Unsplash CDN). If any fail to load, components fall
// back to the offline gradient tile via coverFor.
const COVER_PHOTOS: Record<string, string> = {
  'calm-down': 'photo-1511379938547-c1f69419868d',
  'last-last': 'photo-1511671782779-c97d3d27a1d4',
  ojuelegba: 'photo-1470225620780-dba8ba36b745',
  unavailable: 'photo-1459749411175-04bf5292ceea',
  'free-mind': 'photo-1493225457124-a3eb161ffa5f',
  sungba: 'photo-1514525253161-7a46d19cd819',
};

const slugOf = (title: string) => title.toLowerCase().replace(/[^a-z]+/g, '-');

export function coverPhotoFor(title: string): string | null {
  const id = COVER_PHOTOS[slugOf(title)];
  return id ? `https://images.unsplash.com/${id}?w=500&auto=format&fit=crop&q=80` : null;
}

// Real photo when known, offline gradient tile otherwise.
export function bestCover(title: string, artist: string, color: string): string {
  return coverPhotoFor(title) ?? coverFor('', artist, color);
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
