import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

const trackWithArtist = {
  include: {
    artist: { select: { id: true, name: true } },
    album: { select: { id: true, title: true, cover: true } },
  },
};

@Injectable()
export class LibraryService {
  constructor(private readonly prisma: PrismaService) {}

  // ---- Likes ----
  likedTracks(userId: string) {
    return this.prisma.like.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { track: trackWithArtist },
    });
  }

  async likeTrack(userId: string, trackId: string) {
    await this.ensureTrack(trackId);
    await this.prisma.like.upsert({
      where: { userId_trackId: { userId, trackId } },
      update: {},
      create: { userId, trackId },
    });
    return { ok: true, liked: true };
  }

  async unlikeTrack(userId: string, trackId: string) {
    await this.prisma.like.deleteMany({ where: { userId, trackId } });
    return { ok: true, liked: false };
  }

  // ---- Artist follows ----
  followedArtists(userId: string) {
    return this.prisma.artistFollow.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { artist: true },
    });
  }

  async followArtist(userId: string, artistId: string) {
    await this.ensureArtist(artistId);
    await this.prisma.artistFollow.upsert({
      where: { userId_artistId: { userId, artistId } },
      update: {},
      create: { userId, artistId },
    });
    return { ok: true, following: true };
  }

  async unfollowArtist(userId: string, artistId: string) {
    await this.prisma.artistFollow.deleteMany({ where: { userId, artistId } });
    return { ok: true, following: false };
  }

  // ---- Saved albums ----
  savedAlbums(userId: string) {
    return this.prisma.savedAlbum.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { album: { include: { artist: { select: { id: true, name: true } } } } },
    });
  }

  async saveAlbum(userId: string, albumId: string) {
    const album = await this.prisma.album.findUnique({ where: { id: albumId } });
    if (!album) throw new NotFoundException('Album not found');
    await this.prisma.savedAlbum.upsert({
      where: { userId_albumId: { userId, albumId } },
      update: {},
      create: { userId, albumId },
    });
    return { ok: true, saved: true };
  }

  async unsaveAlbum(userId: string, albumId: string) {
    await this.prisma.savedAlbum.deleteMany({ where: { userId, albumId } });
    return { ok: true, saved: false };
  }

  // ---- Recently played ----
  recentlyPlayed(userId: string, take = 20) {
    return this.prisma.listeningEvent.findMany({
      where: { userId, eventType: { in: ['play', 'complete', 'replay'] } },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(take, 1), 50),
      include: { track: trackWithArtist },
    });
  }

  private async ensureTrack(trackId: string) {
    const track = await this.prisma.track.findUnique({ where: { id: trackId } });
    if (!track) throw new NotFoundException('Track not found');
  }

  private async ensureArtist(artistId: string) {
    const artist = await this.prisma.artist.findUnique({ where: { id: artistId } });
    if (!artist) throw new NotFoundException('Artist not found');
  }
}
