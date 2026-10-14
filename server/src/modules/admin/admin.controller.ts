import { Controller, Get, Param, Post, Req } from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/jwt-auth.guard.js';
import { AdminService } from './admin.service.js';

@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('pending')
  pending(@Req() req: AuthenticatedRequest) {
    this.admin.assertAdmin(req.user.email);
    return this.admin.pending();
  }

  @Post('tracks/:id/approve')
  approve(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    this.admin.assertAdmin(req.user.email);
    return this.admin.approve(id);
  }

  @Post('tracks/:id/reject')
  reject(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    this.admin.assertAdmin(req.user.email);
    return this.admin.reject(id);
  }
}
