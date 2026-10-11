import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

export class CreateArtistDto {
  name!: string;
  bio?: string;
  image?: string;
  country?: string;
  region?: string;
  verified?: boolean;
}

export class CreateAlbumDto {
  artistId!: string;
  title!: string;
  cover?: string;
  releaseDate?: string;
}

export class CreateTrackDto {
  artistId!: string;
  albumId?: string;
  title!: string;
  duration!: number;
  genre?: string;
  language?: string;
  region?: string;
  explicit?: boolean;
}

function page(query: { take?: string; skip?: string }) {
  const take = Math.min(Math.max(Number(query.take ?? 20), 1), 100);
  const skip = Math.max(Number(query.skip ?? 0), 0);
  return { take, skip };
}

@Injectable()
export class CatalogueService {
  constructor(private readonly prisma: PrismaService) {}

  // ---- Artists ----
  listArtists(query: { take?: string; skip?: string; search?: string }) {
    return this.prisma.artist.findMany({
      ...page(query),
      where: query.search
        ? { name: { contains: query.search, mode: 'insensitive' } }
        : undefined,
      orderBy: { name: 'asc' },
    });
  }

  createArtist(dto: CreateArtistDto) {
    return this.prisma.artist.create({ data: { ...dto } });
  }

  artistDetail(id: string) {
    return this.prisma.artist.findUniqueOrThrow({
      where: { id },
      include: {
        albums: true,
        tracks: {
          take: 50,
          include: { album: { select: { id: true, title: true, cover: true } } },
        },
      },
    }).catch(() => {
      throw new NotFoundException('Artist not found');
    });
  }

  updateArtist(id: string, dto: Partial<CreateArtistDto>) {
    return this.prisma.artist.update({ where: { id }, data: { ...dto } }).catch(() => {
      throw new NotFoundException('Artist not found');
    });
  }

  // ---- Albums ----
  listAlbums(query: { take?: string; skip?: string; artistId?: string }) {
    return this.prisma.album.findMany({
      ...page(query),
      where: query.artistId ? { artistId: query.artistId } : undefined,
      include: { artist: { select: { id: true, name: true } } },
      orderBy: { title: 'asc' },
    });
  }

  createAlbum(dto: CreateAlbumDto) {
    return this.prisma.album.create({
      data: {
        artistId: dto.artistId,
        title: dto.title,
        cover: dto.cover,
        releaseDate: dto.releaseDate ? new Date(dto.releaseDate) : undefined,
      },
    });
  }

  albumDetail(id: string) {
    return this.prisma.album.findUniqueOrThrow({
      where: { id },
      include: { artist: true, tracks: { include: { versions: true } } },
    }).catch(() => {
      throw new NotFoundException('Album not found');
    });
  }

  // ---- Tracks ----
  listTracks(query: {
    take?: string;
    skip?: string;
    genre?: string;
    region?: string;
    search?: string;
  }) {
    return this.prisma.track.findMany({
      ...page(query),
      where: {
        status: 'active',
        ...(query.genre ? { genre: query.genre } : {}),
        ...(query.region ? { region: query.region } : {}),
        ...(query.search ? { title: { contains: query.search, mode: 'insensitive' } } : {}),
      },
      include: {
        artist: { select: { id: true, name: true } },
        album: { select: { id: true, title: true, cover: true } },
      },
      orderBy: { title: 'asc' },
    });
  }

  createTrack(dto: CreateTrackDto) {
    return this.prisma.track.create({
      data: { ...dto },
      include: { artist: true },
    });
  }

  trackDetail(id: string) {
    return this.prisma.track.findUniqueOrThrow({
      where: { id },
      include: {
        artist: true,
        album: true,
        versions: { include: { assets: true } },
        rights: true,
      },
    }).catch(() => {
      throw new NotFoundException('Track not found');
    });
  }

  updateTrack(id: string, dto: Partial<CreateTrackDto>) {
    return this.prisma.track.update({ where: { id }, data: { ...dto } }).catch(() => {
      throw new NotFoundException('Track not found');
    });
  }

  async deleteTrack(id: string) {
    try {
      await this.prisma.track.delete({ where: { id } });
      return { ok: true };
    } catch {
      throw new ConflictException('Track cannot be deleted while referenced');
    }
  }

  // ---- Rights (write side; checks live in RightsService) ----
  grantRight(trackId: string, dto: { territory?: string; streamingAllowed?: boolean }) {
    return this.prisma.contentRight.create({
      data: {
        trackId,
        rightType: 'streaming',
        territory: dto.territory ?? 'NG',
        streamingAllowed: dto.streamingAllowed ?? true,
      },
    });
  }
}
