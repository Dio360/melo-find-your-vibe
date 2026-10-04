import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { PlaybackModule } from '../playback/playback.module.js';
import { AiController } from './ai.controller.js';
import { AiPlaylistService } from './ai-playlist.service.js';
import { GroqIntentParserService } from './groq-intent-parser.service.js';
import { INTENT_PARSER, IntentParserService } from './intent-parser.service.js';

function selectParser(): 'groq' | 'rule' {
  const configured = (process.env.AI_PARSER ?? '').toLowerCase();
  if (configured === 'rule') return 'rule';
  if (configured === 'groq') return 'groq';
  return process.env.GROQ_API_KEY ? 'groq' : 'rule';
}

@Module({
  imports: [PlaybackModule],
  controllers: [AiController],
  providers: [
    IntentParserService,
    GroqIntentParserService,
    {
      provide: INTENT_PARSER,
      useFactory: (groq: GroqIntentParserService, rule: IntentParserService) =>
        selectParser() === 'groq' ? groq : rule,
      inject: [GroqIntentParserService, IntentParserService],
    },
    AiPlaylistService,
  ],
})
export class AiModule {}
