import { Controller, Get, Req } from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/jwt-auth.guard.js';
import { HomeService } from './home.service.js';

@Controller('home')
export class HomeController {
  constructor(private readonly home: HomeService) {}

  @Get()
  feed(@Req() req: AuthenticatedRequest) {
    return this.home.feed(req.user.sub);
  }
}
