import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Req } from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/jwt-auth.guard.js';
import { CreatePlaylistDto, PlaylistsService } from './playlists.service.js';

@Controller('playlists')
export class PlaylistsController {
  constructor(private readonly playlists: PlaylistsService) {}

  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreatePlaylistDto) {
    return this.playlists.create(req.user.sub, dto);
  }

  @Get('mine')
  mine(@Req() req: AuthenticatedRequest) {
    return this.playlists.mine(req.user.sub);
  }

  @Get(':id')
  detail(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.playlists.detail(req.user.sub, id);
  }

  @Patch(':id')
  update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: Partial<CreatePlaylistDto>,
  ) {
    return this.playlists.update(req.user.sub, id, dto);
  }

  @Delete(':id')
  remove(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.playlists.remove(req.user.sub, id);
  }

  @Post(':id/tracks')
  addTrack(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: { trackId: string; position?: number },
  ) {
    return this.playlists.addTrack(req.user.sub, id, dto.trackId, dto.position);
  }

  @Delete(':id/tracks/:trackId')
  removeTrack(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Param('trackId') trackId: string,
  ) {
    return this.playlists.removeTrack(req.user.sub, id, trackId);
  }

  @Put(':id/tracks/reorder')
  reorder(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: { orderedIds: string[] },
  ) {
    return this.playlists.reorder(req.user.sub, id, dto.orderedIds ?? []);
  }
}
