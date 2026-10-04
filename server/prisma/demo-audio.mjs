// MELO Phase 3: generate demo audio tones, upload to S3 storage,
// and register AudioAssets per bitrate (Data Saver 64 / Balanced 128 / High 320).
// Run: node prisma/demo-audio.mjs   (S3 mock must be up; ffmpeg required)
import { execFileSync } from 'node:child_process';
import { readFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';
import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

const BITRATES = [64, 128, 320];
const FREQS = [330, 392, 440, 494, 523, 587];
const ENDPOINT = process.env.S3_ENDPOINT ?? 'http://localhost:5000';
const BUCKET = process.env.S3_BUCKET ?? 'melo-audio';
const FFMPEG = process.env.FFMPEG_PATH ?? 'ffmpeg';

const prisma = new PrismaClient();
const s3 = new S3Client({
  region: process.env.S3_REGION ?? 'us-east-1',
  endpoint: ENDPOINT,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY ?? 'test',
    secretAccessKey: process.env.S3_SECRET_KEY ?? 'test',
  },
});

const slug = (s) => s.toLowerCase().replace(/[^a-z]+/g, '-');

async function main() {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: BUCKET }));
  } catch {
    await s3.send(new CreateBucketCommand({ Bucket: BUCKET }));
  }

  const tracks = await prisma.track.findMany({
    include: { versions: true },
    orderBy: { title: 'asc' },
  });

  let i = 0;
  for (const track of tracks) {
    const version = track.versions[0];
    if (!version) continue;
    const freq = FREQS[i++ % FREQS.length];

    await prisma.audioAsset.deleteMany({ where: { trackVersionId: version.id } });

    for (const br of BITRATES) {
      const key = `demo/${slug(track.title)}-${br}k.mp3`;
      const tmp = join(tmpdir(), `melo-${slug(track.title)}-${br}k.mp3`);
      execFileSync(FFMPEG, [
        '-y',
        '-v',
        'error',
        '-f',
        'lavfi',
        '-i',
        `sine=frequency=${freq}:duration=30`,
        '-b:a',
        `${br}k`,
        '-ar',
        '44100',
        tmp,
      ]);
      const body = readFileSync(tmp);
      await s3.send(
        new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body, ContentType: 'audio/mpeg' }),
      );
      unlinkSync(tmp);
      await prisma.audioAsset.create({
        data: {
          trackVersionId: version.id,
          storageKey: key,
          format: 'mp3',
          bitrate: br,
          sampleRate: 44100,
          duration: 30,
          status: 'demo',
        },
      });
      console.log(`uploaded ${key} (${(body.length / 1024).toFixed(0)} KB)`);
    }
  }
  console.log('demo audio complete');
}

await main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
