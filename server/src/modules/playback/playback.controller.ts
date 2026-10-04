import { Controller, Get, Query, Req } from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/jwt-auth.guard.js';
import { PlaybackService } from './playback.service.js';

@Controller('playback')
export class PlaybackController {
  constructor(private readonly playback: PlaybackService) {}

  @Get('authorize')
  authorize(
    @Req() req: AuthenticatedRequest,
    @Query('trackId') trackId: string,
    @Query('quality') quality?: string,
    @Query('territory') territory?: string,
  ) {
    void req.user.sub;
    return this.playback.authorize(trackId, quality ?? 'balanced', territory ?? 'NG');
  }
}
