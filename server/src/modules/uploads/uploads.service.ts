import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service.js';
import { StorageService } from '../storage/storage.service.js';

export const UPLOAD_MOODS = ['worship', 'praise', 'prayer', 'bible-study'] as const;
export type UploadMood = (typeof UPLOAD_MOODS)[number];

/**
 * User uploads (stack v2, Christian-first).
 * Flow: presign → client PUTs MP3 (+ optional cover) straight to R2 →
 * complete() mints a pending_review track. Nothing becomes playable until
 * an admin approves it (rights gate requires active track + active right +
 * ready/demo asset), so unlicensed content can never leak into playback.
 * AI-generated worship placeholders use source='ai-generated' and are
 * always labelled as such; user files use source='user-upload'.
 */
@Injectable()
export class UploadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async presign(userId: string, contentType: string, coverContentType?: string) {
    if (contentType !== 'audio/mpeg') {
      throw new BadRequestException('Only audio/mpeg uploads are accepted');
    }
    if (coverContentType && !['image/jpeg', 'image/png', 'image/webp'].includes(coverContentType)) {
      throw new BadRequestException('Cover must be jpeg, png, or webp');
    }
    const id = randomUUID();
    const audioKey = `uploads/${userId}/${id}.mp3`;
    const audioUploadUrl = await this.storage.presignedPutUrl(audioKey, contentType);
    let coverKey: string | null = null;
    let coverUploadUrl: string | null = null;
    if (coverContentType) {
      const ext = coverContentType === 'image/png' ? 'png' : coverContentType === 'image/webp' ? 'webp' : 'jpg';
      coverKey = `uploads/${userId}/${id}-cover.${ext}`;
      coverUploadUrl = await this.storage.presignedPutUrl(coverKey, coverContentType);
    }
    return { uploadId: id, audioKey, audioUploadUrl, coverKey, coverUploadUrl, expiresIn: 900 };
  }

  async complete(
    userId: string,
    input: {
      uploadId: string;
      audioKey: string;
      coverKey?: string | null;
      title: string;
      artistName: string;
      albumTitle?: string;
      duration: number;
      genre?: string;
      moods?: string[];
      source?: 'user-upload' | 'ai-generated';
      rightsDeclaration: string;
    },
  ) {
    const title = input.title.trim();
    const artistName = input.artistName.trim();
    if (!title || !artistName) throw new BadRequestException('title and artistName are required');
    if (!Number.isFinite(input.duration) || input.duration <= 0 || input.duration > 3600) {
      throw new BadRequestException('duration must be 1..3600 seconds');
    }
    if (!input.audioKey.startsWith(`uploads/${userId}/`) || !input.audioKey.endsWith('.mp3')) {
      throw new BadRequestException('audioKey does not match a presigned upload for this user');
    }
    if (!input.rightsDeclaration || input.rightsDeclaration.trim().length < 10) {
      throw new BadRequestException('rightsDeclaration is required (who owns this recording and why you may share it)');
    }
    const moods = (input.moods ?? []).filter((m): m is UploadMood =>
      (UPLOAD_MOODS as readonly string[]).includes(m),
    );
    const source = input.source === 'ai-generated' ? 'ai-generated' : 'user-upload';

    // Reuse existing artist/album when they match, else mint pending_review rows.
    const artist =
      (await this.prisma.artist.findFirst({ where: { name: artistName } })) ??
      (await this.prisma.artist.create({ data: { name: artistName, status: 'pending_review' } }));
    let albumId: string | null = null;
    if (input.albumTitle?.trim()) {
      const albumTitle = input.albumTitle.trim();
      const album =
        (await this.prisma.album.findFirst({ where: { artistId: artist.id, title: albumTitle } })) ??
        (await this.prisma.album.create({
          data: {
            artistId: artist.id,
            title: albumTitle,
            cover: input.coverKey ?? undefined,
            status: 'pending_review',
          },
        }));
      albumId = album.id;
    }
    const track = await this.prisma.track.create({
      data: {
        artistId: artist.id,
        albumId,
        title: `${title}${source === 'ai-generated' ? ' (AI-generated)' : ''}`,
        duration: Math.round(input.duration),
        genre: input.genre ?? 'Gospel',
        language: 'English',
        region: 'Nigeria',
        status: 'pending_review',
        versions: {
          create: {
            versionType: 'original',
            duration: Math.round(input.duration),
            status: 'pending_review',
            assets: {
              create: {
                storageKey: input.audioKey,
                format: 'mp3',
                bitrate: 128,
                duration: Math.round(input.duration),
                status: 'pending_review',
              },
            },
          },
        },
        rights: {
          create: {
            rightType: 'streaming',
            territory: 'NG',
            streamingAllowed: false,
            status: 'pending_review',
          },
        },
      },
    });
    void moods;
    return { trackId: track.id, status: 'pending_review' as const, source, moods };
  }
}
