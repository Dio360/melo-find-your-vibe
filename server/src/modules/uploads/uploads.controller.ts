import { Body, Controller, Post, Req } from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/jwt-auth.guard.js';
import { UploadsService } from './uploads.service.js';

@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploads: UploadsService) {}

  @Post('presign')
  presign(
    @Req() req: AuthenticatedRequest,
    @Body() body: { contentType?: string; coverContentType?: string },
  ) {
    return this.uploads.presign(
      req.user.sub,
      body.contentType ?? 'audio/mpeg',
      body.coverContentType,
    );
  }

  @Post('complete')
  complete(@Req() req: AuthenticatedRequest, @Body() body: Record<string, unknown>) {
    return this.uploads.complete(req.user.sub, {
      uploadId: String(body['uploadId'] ?? ''),
      audioKey: String(body['audioKey'] ?? ''),
      coverKey: body['coverKey'] ? String(body['coverKey']) : null,
      title: String(body['title'] ?? ''),
      artistName: String(body['artistName'] ?? ''),
      albumTitle: body['albumTitle'] ? String(body['albumTitle']) : undefined,
      duration: Number(body['duration'] ?? 0),
      genre: body['genre'] ? String(body['genre']) : undefined,
      moods: Array.isArray(body['moods']) ? (body['moods'] as string[]) : [],
      source: body['source'] === 'ai-generated' ? 'ai-generated' : 'user-upload',
      rightsDeclaration: String(body['rightsDeclaration'] ?? ''),
    });
  }
}
