import { Module } from '@nestjs/common';
import { AiGenerateController } from './ai-generate.controller.js';

@Module({
  controllers: [AiGenerateController],
})
export class AiGenerateModule {}
