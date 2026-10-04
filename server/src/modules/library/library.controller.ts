import { Controller, Delete, Get, Param, Post, Query, Req } from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/jwt-auth.guard.js';
import { LibraryService } from './library.service.js';

@Controller('library')
export class LibraryController {
  constructor(private readonly library: LibraryService) {}

  @Get('likes')
  likedTracks(@Req() req: AuthenticatedRequest) {
    return this.library.likedTracks(req.user.sub);
  }

  @Post('likes/:trackId')
  likeTrack(@Req() req: AuthenticatedRequest, @Param('trackId') trackId: string) {
    return this.library.likeTrack(req.user.sub, trackId);
  }

  @Delete('likes/:trackId')
  unlikeTrack(@Req() req: AuthenticatedRequest, @Param('trackId') trackId: string) {
    return this.library.unlikeTrack(req.user.sub, trackId);
  }

  @Get('artists')
  followedArtists(@Req() req: AuthenticatedRequest) {
    return this.library.followedArtists(req.user.sub);
  }

  @Post('artists/:artistId')
  followArtist(@Req() req: AuthenticatedRequest, @Param('artistId') artistId: string) {
    return this.library.followArtist(req.user.sub, artistId);
  }

  @Delete('artists/:artistId')
  unfollowArtist(@Req() req: AuthenticatedRequest, @Param('artistId') artistId: string) {
    return this.library.unfollowArtist(req.user.sub, artistId);
  }

  @Get('albums')
  savedAlbums(@Req() req: AuthenticatedRequest) {
    return this.library.savedAlbums(req.user.sub);
  }

  @Post('albums/:albumId')
  saveAlbum(@Req() req: AuthenticatedRequest, @Param('albumId') albumId: string) {
    return this.library.saveAlbum(req.user.sub, albumId);
  }

  @Delete('albums/:albumId')
  unsaveAlbum(@Req() req: AuthenticatedRequest, @Param('albumId') albumId: string) {
    return this.library.unsaveAlbum(req.user.sub, albumId);
  }

  @Get('recent')
  recentlyPlayed(@Req() req: AuthenticatedRequest, @Query('take') take?: string) {
    return this.library.recentlyPlayed(req.user.sub, take ? Number(take) : 20);
  }
}
