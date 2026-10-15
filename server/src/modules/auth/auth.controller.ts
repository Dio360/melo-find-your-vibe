import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import {
  AuthService,
  PasswordDto,
  RequestOtpDto,
  VerifyOtpDto,
} from './auth.service.js';
import { Public } from './public.decorator.js';
import type { AuthenticatedRequest } from './jwt-auth.guard.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  register(@Body() dto: PasswordDto) {
    return this.auth.register(dto);
  }

  @Public()
  @Post('login')
  login(@Body() dto: PasswordDto) {
    return this.auth.login(dto);
  }

  @Public()
  @Post('password/forgot')
  forgotPassword(@Body() dto: { email?: string }) {
    return this.auth.forgotPassword(String(dto.email ?? ''));
  }

  @Public()
  @Post('password/reset')
  resetPassword(@Body() dto: { token?: string; password?: string }) {
    return this.auth.resetPassword(String(dto.token ?? ''), String(dto.password ?? ''));
  }

  @Public()
  @Post('google')
  googleLogin(@Body() dto: { idToken?: string }) {
    return this.auth.googleLogin(String(dto.idToken ?? ''));
  }

  // OTP kept live but no longer offered in the UI (password auth is primary).
  @Public()
  @Post('otp/request')
  requestOtp(@Body() dto: RequestOtpDto) {
    return this.auth.requestOtp(dto);
  }

  @Public()
  @Post('otp/verify')
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.auth.verifyOtp(dto);
  }

  @Get('me')
  me(@Req() req: AuthenticatedRequest) {
    return { userId: req.user.sub, phone: req.user.phone ?? null, email: req.user.email ?? null };
  }
}
