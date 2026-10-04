import { Module } from '@nestjs/common';
import { VibesController } from './vibes.controller.js';
import { VibesService } from './vibes.service.js';

@Module({
  controllers: [VibesController],
  providers: [VibesService],
  exports: [VibesService],
})
export class VibesModule {}
