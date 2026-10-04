import { Body, Controller, Get, Patch, Put, Req } from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/jwt-auth.guard.js';
import {
  UpdatePreferencesDto,
  UpdateProfileDto,
  UsersService,
} from './users.service.js';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  me(@Req() req: AuthenticatedRequest) {
    return this.users.me(req.user.sub);
  }

  @Patch('me')
  updateProfile(@Req() req: AuthenticatedRequest, @Body() dto: UpdateProfileDto) {
    return this.users.updateProfile(req.user.sub, dto);
  }

  @Put('me/preferences')
  updatePreferences(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdatePreferencesDto,
  ) {
    return this.users.updatePreferences(req.user.sub, dto);
  }
}
