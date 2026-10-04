import { Module } from '@nestjs/common';
import { PlaybackModule } from '../playback/playback.module.js';
import { AiController } from './ai.controller.js';
import { AiPlaylistService } from './ai-playlist.service.js';
import { IntentParserService } from './intent-parser.service.js';

@Module({
  imports: [PlaybackModule],
  controllers: [AiController],
  providers: [IntentParserService, AiPlaylistService],
})
export class AiModule {}
