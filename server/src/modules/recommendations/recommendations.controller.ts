import { Controller, Get, Query, Req } from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/jwt-auth.guard.js';
import { RecommendationsService } from './recommendations.service.js';

@Controller('recommendations')
export class RecommendationsController {
  constructor(private readonly recs: RecommendationsService) {}

  @Get('for-you')
  forYou(@Req() req: AuthenticatedRequest, @Query('take') take?: string) {
    return this.recs.forYou(req.user.sub, take ? Number(take) : 20);
  }
}
