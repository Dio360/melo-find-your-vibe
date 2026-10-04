import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

export interface RightsDecision {
  allowed: boolean;
  reason?: 'unavailable' | 'not-licensed' | 'no-stream';
}

/**
 * Pre-playback authorization (Phase 3).
 * Answers: "Can this user play this track right now?"
 */
@Injectable()
export class RightsService {
  constructor(private readonly prisma: PrismaService) {}

  async canUserPlayTrack(trackId: string, territory = 'NG'): Promise<RightsDecision> {
    const track = await this.prisma.track.findUnique({
      where: { id: trackId },
      include: { rights: true },
    });
    if (!track || track.status !== 'active') {
      return { allowed: false, reason: 'unavailable' };
    }

    const now = new Date();
    const right = track.rights.find(
      (r) =>
        r.status === 'active' &&
        r.streamingAllowed &&
        (r.territory === territory || r.territory === '*') &&
        (!r.startAt || r.startAt <= now) &&
        (!r.endAt || r.endAt >= now),
    );
    if (!right) {
      return { allowed: false, reason: 'not-licensed' };
    }
    return { allowed: true };
  }
}
