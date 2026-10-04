import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

export const LISTENING_EVENTS = [
  'play',
  'pause',
  'skip',
  'complete',
  'replay',
  'like',
  'unlike',
  'save',
  'playlist_add',
  'search',
  'vibe_select',
  'follow',
  'recommendation_click',
] as const;

export class LogEventDto {
  trackId?: string;
  eventType!: string;
  position?: number;
  duration?: number;
  device?: string;
  network?: string;
  sessionId?: string;
}

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  log(userId: string, dto: LogEventDto) {
    if (!(LISTENING_EVENTS as readonly string[]).includes(dto.eventType)) {
      throw new BadRequestException('Unknown event type');
    }
    return this.prisma.listeningEvent.create({
      data: {
        userId,
        trackId: dto.trackId,
        eventType: dto.eventType,
        position: dto.position,
        duration: dto.duration,
        device: dto.device,
        network: dto.network,
        sessionId: dto.sessionId,
      },
      select: { id: true, createdAt: true },
    });
  }
}
