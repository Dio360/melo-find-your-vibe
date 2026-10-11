import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

function greetingFor(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Home feed aggregator (Phase 4): greeting, vibes, spotlight, trending.
 */
@Injectable()
export class HomeService {
  constructor(private readonly prisma: PrismaService) {}

  async feed(userId: string) {
    const [vibes, spotlight, trending, recent] = await Promise.all([
      this.prisma.vibe.findMany({ where: { active: true }, take: 7 }),
      this.prisma.track.findMany({
        where: { status: 'active', region: 'Nigeria' },
        include: {
          artist: { select: { id: true, name: true } },
          album: { select: { id: true, title: true, cover: true } },
        },
        take: 6,
      }),
      this.prisma.track.findMany({
        where: { status: 'active' },
        include: {
          artist: { select: { id: true, name: true } },
          album: { select: { id: true, title: true, cover: true } },
          _count: { select: { likes: true } },
        },
        orderBy: { likes: { _count: 'desc' } },
        take: 6,
      }),
      this.prisma.listeningEvent.findMany({
        where: { userId, eventType: { in: ['complete', 'play'] } },
        include: {
          track: {
            include: {
              artist: { select: { id: true, name: true } },
              album: { select: { id: true, title: true, cover: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    return {
      greeting: greetingFor(new Date().getHours()),
      yourVibe: vibes.slice(0, 4),
      discoverVibes: vibes,
      africanSpotlight: spotlight,
      trending: trending.map(({ _count, ...t }) => ({
        ...t,
        likes: _count.likes,
      })),
      recentlyPlayed: recent.map((e) => e.track).filter(Boolean),
    };
  }
}
