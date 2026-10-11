import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

export class CreatePlaylistDto {
  name!: string;
  description?: string;
  visibility?: string;
}

const trackView = {
  include: {
    track: {
      include: {
        artist: { select: { id: true, name: true } },
        album: { select: { id: true, title: true, cover: true } },
      },
    },
  },
  orderBy: { position: 'asc' as const },
};

@Injectable()
export class PlaylistsService {
  constructor(private readonly prisma: PrismaService) {}

  create(userId: string, dto: CreatePlaylistDto) {
    if (!dto.name?.trim()) {
      throw new NotFoundException('Playlist name required');
    }
    return this.prisma.playlist.create({
      data: {
        ownerId: userId,
        name: dto.name.trim(),
        description: dto.description,
        visibility: dto.visibility === 'public' ? 'public' : 'private',
      },
    });
  }

  mine(userId: string) {
    return this.prisma.playlist.findMany({
      where: { ownerId: userId },
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { tracks: true } } },
    });
  }

  async detail(userId: string, id: string) {
    const playlist = await this.prisma.playlist.findUnique({
      where: { id },
      include: { tracks: trackView },
    });
    if (!playlist) throw new NotFoundException('Playlist not found');
    if (playlist.ownerId !== userId && playlist.visibility !== 'public') {
      throw new ForbiddenException('Private playlist');
    }
    return playlist;
  }

  async update(userId: string, id: string, dto: Partial<CreatePlaylistDto>) {
    const playlist = await this.owned(userId, id);
    return this.prisma.playlist.update({
      where: { id: playlist.id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.visibility !== undefined
          ? { visibility: dto.visibility === 'public' ? 'public' : 'private' }
          : {}),
      },
    });
  }

  async remove(userId: string, id: string) {
    await this.owned(userId, id);
    await this.prisma.playlist.delete({ where: { id } });
    return { ok: true };
  }

  async addTrack(userId: string, id: string, trackId: string, position?: number) {
    const playlist = await this.owned(userId, id);
    const track = await this.prisma.track.findUnique({ where: { id: trackId } });
    if (!track) throw new NotFoundException('Track not found');

    const count = await this.prisma.playlistTrack.count({ where: { playlistId: id } });
    const pos = position ?? count;
    await this.prisma.playlistTrack.upsert({
      where: { playlistId_trackId: { playlistId: id, trackId } },
      update: { position: pos },
      create: { playlistId: id, trackId, position: pos },
    });
    await this.touch(id);
    return this.detail(userId, playlist.id);
  }

  async removeTrack(userId: string, id: string, trackId: string) {
    await this.owned(userId, id);
    await this.prisma.playlistTrack.deleteMany({ where: { playlistId: id, trackId } });
    await this.touch(id);
    return { ok: true };
  }

  async reorder(userId: string, id: string, orderedIds: string[]) {
    const playlist = await this.owned(userId, id);
    const existing = await this.prisma.playlistTrack.findMany({
      where: { playlistId: id },
      select: { trackId: true },
    });
    const valid = new Set(existing.map((e) => e.trackId));
    const updates = orderedIds
      .filter((trackId) => valid.has(trackId))
      .map((trackId, position) =>
        this.prisma.playlistTrack.update({
          where: { playlistId_trackId: { playlistId: id, trackId } },
          data: { position },
        }),
      );
    await this.prisma.$transaction(updates);
    await this.touch(id);
    return this.detail(userId, playlist.id);
  }

  private async owned(userId: string, id: string) {
    const playlist = await this.prisma.playlist.findUnique({ where: { id } });
    if (!playlist) throw new NotFoundException('Playlist not found');
    if (playlist.ownerId !== userId) throw new ForbiddenException('Not your playlist');
    return playlist;
  }

  private touch(id: string) {
    return this.prisma.playlist.update({ where: { id }, data: { updatedAt: new Date() } });
  }
}
