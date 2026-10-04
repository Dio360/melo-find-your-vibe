import { Body, Controller, Post, Req } from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/jwt-auth.guard.js';
import { AiPlaylistService } from './ai-playlist.service.js';

@Controller('ai')
export class AiController {
  constructor(private readonly ai: AiPlaylistService) {}

  @Post('interpret')
  async interpret(@Body() dto: { prompt: string }) {
    return { parser: this.ai.parserName(), intent: await this.ai.interpret(dto.prompt ?? '') };
  }

  @Post('playlist')
  playlist(
    @Req() req: AuthenticatedRequest,
    @Body() dto: { prompt: string; name?: string; count?: number },
  ) {
    return this.ai.generate(req.user.sub, dto.prompt ?? '', dto.name, dto.count ?? 20);
  }
}
