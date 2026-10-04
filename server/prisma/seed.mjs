// MELO Phase 2 seed: vibe taxonomy + mock African catalogue metadata.
// Metadata only — demo audio assets, no commercial catalogue.
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const VIBES = [
  { name: 'Naija Chill', category: 'african', colorHex: '#00E5FF' },
  { name: 'Lagos Night Drive', category: 'context', colorHex: '#FF5722' },
  { name: 'Afrobeat Energy', category: 'mood', colorHex: '#FFC107' },
  { name: 'Late Night Study', category: 'activity', colorHex: '#1DB95D' },
  { name: 'Amapiano Grooves', category: 'african', colorHex: '#E91E63' },
  { name: 'Sunday Morning', category: 'context', colorHex: '#FF9800' },
  { name: 'Highlife Classics', category: 'african', colorHex: '#8BC34A' },
];

const ARTISTS = [
  { name: 'Rema', country: 'Nigeria', region: 'West Africa', verified: true },
  { name: 'Burna Boy', country: 'Nigeria', region: 'West Africa', verified: true },
  { name: 'Wizkid', country: 'Nigeria', region: 'West Africa', verified: true },
  { name: 'Davido', country: 'Nigeria', region: 'West Africa', verified: true },
  { name: 'Tems', country: 'Nigeria', region: 'West Africa', verified: true },
  { name: 'Asake', country: 'Nigeria', region: 'West Africa', verified: true },
];

const TRACKS = [
  { artist: 'Rema', title: 'Calm Down', album: 'Rave & Roses', genre: 'Afrorave', duration: 219 },
  { artist: 'Burna Boy', title: 'Last Last', album: 'Love, Damini', genre: 'Afrobeats', duration: 172 },
  { artist: 'Wizkid', title: 'Ojuelegba', album: 'Ayo', genre: 'Afrobeats', duration: 216 },
  { artist: 'Davido', title: 'Unavailable', album: 'Timeless', genre: 'Amapiano', duration: 170 },
  { artist: 'Tems', title: 'Free Mind', album: 'For Broken Ears', genre: 'Alté', duration: 247 },
  { artist: 'Asake', title: 'Sungba', album: 'Ololade Asake', genre: 'Fuji-Fusion', duration: 210 },
];

async function main() {
  for (const vibe of VIBES) {
    await prisma.vibe.upsert({
      where: { name: vibe.name },
      update: vibe,
      create: vibe,
    });
  }

  for (const track of TRACKS) {
    const meta = ARTISTS.find((a) => a.name === track.artist);
    const artist = await prisma.artist.upsert({
      where: { id: `demo-${track.artist.toLowerCase().replace(/[^a-z]+/g, '-')}` },
      update: {},
      create: { id: `demo-${track.artist.toLowerCase().replace(/[^a-z]+/g, '-')}`, ...meta },
    }).catch(async () => {
      // Fall back to lookup when the deterministic id already maps elsewhere.
      const found = await prisma.artist.findFirst({ where: { name: track.artist } });
      if (!found) throw new Error(`artist missing: ${track.artist}`);
      return found;
    });

    const album = await prisma.album.create({
      data: { artistId: artist.id, title: track.album },
    });

    const created = await prisma.track.create({
      data: {
        artistId: artist.id,
        albumId: album.id,
        title: track.title,
        duration: track.duration,
        genre: track.genre,
        language: 'English',
        region: 'Nigeria',
        versions: {
          create: {
            versionType: 'original',
            duration: track.duration,
            assets: {
              create: {
                storageKey: `demo/${track.title.toLowerCase().replace(/[^a-z]+/g, '-')}.mp3`,
                format: 'mp3',
                bitrate: 128,
                duration: track.duration,
                status: 'demo',
              },
            },
          },
        },
        rights: {
          create: { rightType: 'streaming', territory: 'NG', streamingAllowed: true },
        },
      },
    });
    console.log(`seeded track: ${track.artist} — ${created.title}`);
  }

  const counts = {
    vibes: await prisma.vibe.count(),
    artists: await prisma.artist.count(),
    tracks: await prisma.track.count(),
  };
  console.log('seed complete:', counts);
}

await main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
