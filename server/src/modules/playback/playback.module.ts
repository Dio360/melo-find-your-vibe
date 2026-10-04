import { Module } from '@nestjs/common';
import { PlaybackController } from './playback.controller.js';
import { PlaybackService } from './playback.service.js';
import { RightsService } from './rights.service.js';

@Module({
  controllers: [PlaybackController],
  providers: [PlaybackService, RightsService],
  exports: [RightsService],
})
export class PlaybackModule {}
