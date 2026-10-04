import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { StorageService } from '../storage/storage.service.js';
import { RightsService } from './rights.service.js';

const QUALITY_BITRATES: Record<string, number> = {
  data_saver: 64,
  balanced: 128,
  high: 320,
  auto: 128,
};

export interface AuthorizeResult {
  allowed: boolean;
  reason?: 'unavailable' | 'not-licensed' | 'no-stream';
  streamUrl?: string;
  expiresIn?: number;
  bitrate?: number;
}

@Injectable()
export class PlaybackService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rights: RightsService,
    private readonly storage: StorageService,
  ) {}

  async authorize(
    trackId: string,
    quality = 'balanced',
    territory = 'NG',
  ): Promise<AuthorizeResult> {
    const decision = await this.rights.canUserPlayTrack(trackId, territory);
    if (!decision.allowed) return decision;

    const target = QUALITY_BITRATES[quality] ?? QUALITY_BITRATES.balanced;
    const track = await this.prisma.track.findUniqueOrThrow({
      where: { id: trackId },
      include: { versions: { include: { assets: true } } },
    });

    const assets = track.versions
      .flatMap((v) => v.assets)
      .filter((a) => a.status === 'ready' || a.status === 'demo');
    const asset = assets.find((a) => a.bitrate === target) ?? assets[0];
    if (!asset) {
      return { allowed: false, reason: 'no-stream' };
    }

    const expiresIn = Number(process.env.PLAYBACK_URL_TTL_SECONDS ?? 900);
    const streamUrl = await this.storage.presignedGetUrl(asset.storageKey, expiresIn);
    return { allowed: true, streamUrl, expiresIn, bitrate: asset.bitrate };
  }
}
