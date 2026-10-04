import { Body, Controller, Post, Req } from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/jwt-auth.guard.js';
import { EventsService, LogEventDto } from './events.service.js';

@Controller('events')
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Post('listen')
  log(@Req() req: AuthenticatedRequest, @Body() dto: LogEventDto) {
    return this.events.log(req.user.sub, dto);
  }
}
