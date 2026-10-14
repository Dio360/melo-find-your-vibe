import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

/** Admin gate: ADMIN_EMAILS (comma-separated). Admins must sign in with email
 * OTP so the JWT carries an email claim; phone-only sessions are rejected. */
@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  assertAdmin(email: string | null | undefined): string {
    const allow = (process.env.ADMIN_EMAILS ?? '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    const who = (email ?? '').trim().toLowerCase();
    if (!who || !allow.includes(who)) {
      throw new ForbiddenException('Admin access required');
    }
    return who;
  }

  pending() {
    return this.prisma.track.findMany({
      where: { status: 'pending_review' },
      include: {
        artist: { select: { id: true, name: true } },
        album: { select: { id: true, title: true } },
        versions: { include: { assets: true } },
        rights: true,
      },
      orderBy: { title: 'asc' },
      take: 100,
    });
  }

  async approve(trackId: string) {
    await this.prisma.track.update({ where: { id: trackId }, data: { status: 'active' } });
    await this.prisma.trackVersion.updateMany({
      where: { trackId },
      data: { status: 'active' },
    });
    await this.prisma.audioAsset.updateMany({
      where: { version: { trackId } },
      data: { status: 'ready' },
    });
    await this.prisma.contentRight.updateMany({
      where: { trackId },
      data: { status: 'active', streamingAllowed: true },
    });
    return { trackId, status: 'active' as const };
  }

  async reject(trackId: string) {
    await this.prisma.track.update({ where: { id: trackId }, data: { status: 'rejected' } });
    await this.prisma.contentRight.updateMany({
      where: { trackId },
      data: { status: 'rejected', streamingAllowed: false },
    });
    return { trackId, status: 'rejected' as const };
  }
}
