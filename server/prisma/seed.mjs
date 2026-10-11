// MELO Phase 2 seed: vibe taxonomy + mock African catalogue metadata.
// Metadata only — demo audio assets, no commercial catalogue.
//
// Artwork notes (Phase 10):
// - Artist photos are real, freely-licensed portraits from Wikimedia Commons.
// - Album covers use royalty-cleared Unsplash photography as prototype art
//   (NOT the commercial cover artwork, which is copyrighted). Release dates
//   are deliberately left null — inventing them would fabricate catalogue
//   facts, which the PRD forbids.
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

// Real, freely-licensed portraits (Wikimedia Commons), served at 500px.
const ARTISTS = [
  {
    name: 'Rema',
    country: 'Nigeria',
    region: 'West Africa',
    verified: true,
    image:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Rema_Performing_live_in_Boston_%28May_2025%29_%28cropped%29.jpg/500px-Rema_Performing_live_in_Boston_%28May_2025%29_%28cropped%29.jpg',
  },
  {
    name: 'Burna Boy',
    country: 'Nigeria',
    region: 'West Africa',
    verified: true,
    image:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/Untold_2024_-Burna_Boy_%2853926047977%29_%28cropped%29.jpg/500px-Untold_2024_-Burna_Boy_%2853926047977%29_%28cropped%29.jpg',
  },
  {
    name: 'Wizkid',
    country: 'Nigeria',
    region: 'West Africa',
    verified: true,
    image:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b6/Artworks-UWHjOik17qMFy0Sb-64tibA-t500x500.jpg/500px-Artworks-UWHjOik17qMFy0Sb-64tibA-t500x500.jpg',
  },
  {
    name: 'Davido',
    country: 'Nigeria',
    region: 'West Africa',
    verified: true,
    image:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/Davido_2024_%28cropped%29.jpg/500px-Davido_2024_%28cropped%29.jpg',
  },
  {
    name: 'Tems',
    country: 'Nigeria',
    region: 'West Africa',
    verified: true,
    image:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Tems_Afro_Plus_Fest_%2855514652102%29.jpg/500px-Tems_Afro_Plus_Fest_%2855514652102%29.jpg',
  },
  {
    name: 'Asake',
    country: 'Nigeria',
    region: 'West Africa',
    verified: true,
    image:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fc/Asake_in_2024_performing_at_a_Toronto_concert.png/500px-Asake_in_2024_performing_at_a_Toronto_concert.png',
  },
];

// Royalty-cleared Unsplash photography used as prototype album cover art.
const unsplash = (id) =>
  `https://images.unsplash.com/${id}?w=500&auto=format&fit=crop&q=80`;

// cover: prototype art (royalty-cleared), NOT the commercial cover.
const TRACKS = [
  { artist: 'Rema', title: 'Calm Down', album: 'Rave & Roses', genre: 'Afrorave', duration: 219, cover: unsplash('photo-1511379938547-c1f69419868d') },
  { artist: 'Burna Boy', title: 'Last Last', album: 'Love, Damini', genre: 'Afrobeats', duration: 172, cover: unsplash('photo-1511671782779-c97d3d27a1d4') },
  { artist: 'Wizkid', title: 'Ojuelegba', album: 'Ayo', genre: 'Afrobeats', duration: 216, cover: unsplash('photo-1470225620780-dba8ba36b745') },
  { artist: 'Davido', title: 'Unavailable', album: 'Timeless', genre: 'Amapiano', duration: 170, cover: unsplash('photo-1459749411175-04bf5292ceea') },
  { artist: 'Tems', title: 'Free Mind', album: 'For Broken Ears', genre: 'Alté', duration: 247, cover: unsplash('photo-1493225457124-a3eb161ffa5f') },
  { artist: 'Asake', title: 'Sungba', album: 'Ololade Asake', genre: 'Fuji-Fusion', duration: 210, cover: unsplash('photo-1514525253161-7a46d19cd819') },
];

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

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
    const artistId = `demo-${slug(track.artist)}`;
    // update: meta so re-seeding backfills image/cover onto existing rows.
    const artist = await prisma.artist.upsert({
      where: { id: artistId },
      update: meta,
      create: { id: artistId, ...meta },
    }).catch(async () => {
      // Fall back to lookup when the deterministic id already maps elsewhere.
      const found = await prisma.artist.findFirst({ where: { name: track.artist } });
      if (!found) throw new Error(`artist missing: ${track.artist}`);
      return found;
    });

    // Albums/tracks may already exist under generated UUID ids (seeded before
    // deterministic ids), so match on the natural key and only mint the
    // deterministic id on first insert. Keeps re-seeding duplicate-free.
    const existingAlbum = await prisma.album.findFirst({
      where: { artistId: artist.id, title: track.album },
    });
    const album = existingAlbum
      ? await prisma.album.update({
          where: { id: existingAlbum.id },
          data: { cover: track.cover },
        })
      : await prisma.album.create({
          data: {
            id: `album-${slug(track.album)}`,
            artistId: artist.id,
            title: track.album,
            cover: track.cover,
          },
        });

    const existingTrack = await prisma.track.findFirst({
      where: { artistId: artist.id, title: track.title },
    });
    let created;
    if (existingTrack) {
      created = await prisma.track.update({
        where: { id: existingTrack.id },
        data: { albumId: album.id },
      });
    } else {
      created = await prisma.track.create({
        data: {
          id: `track-${slug(track.title)}`,
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
                  storageKey: `demo/${slug(track.title)}.mp3`,
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
    }
    console.log(`seeded track: ${track.artist} — ${created.title}`);
  }

  const counts = {
    vibes: await prisma.vibe.count(),
    artists: await prisma.artist.count(),
    albums: await prisma.album.count(),
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
