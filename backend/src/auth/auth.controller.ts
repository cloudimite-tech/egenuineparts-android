import { Body, Controller, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { EmailDto, ResetPasswordDto, VerifyEmailDto } from './dto/codes.dto';
import { clientIp } from '../security/rate-limit';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { NoGuestGuard } from '../common/guards/no-guest.guard';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  // Creates the account and emails a 6-digit code; no session until verified.
  @Post('register')
  register(@Body() dto: RegisterDto, @Req() req: any) {
    return this.auth.register(dto, clientIp(req));
  }

  @Post('verify-email')
  @HttpCode(200)
  verify(@Body() dto: VerifyEmailDto, @Req() req: any) {
    return this.auth.verifyEmail(dto.email, dto.code, clientIp(req));
  }

  @Post('resend-code')
  @HttpCode(200)
  resend(@Body() dto: EmailDto, @Req() req: any) {
    return this.auth.resendVerification(dto.email, clientIp(req));
  }

  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto, @Req() req: any) {
    return this.auth.login(dto, clientIp(req));
  }

  @Post('forgot-password')
  @HttpCode(200)
  forgot(@Body() dto: EmailDto, @Req() req: any) {
    return this.auth.forgotPassword(dto.email, clientIp(req));
  }

  @Post('reset-password')
  @HttpCode(200)
  reset(@Body() dto: ResetPasswordDto, @Req() req: any) {
    return this.auth.resetPassword(dto.email, dto.code, dto.password, clientIp(req));
  }

  @Post('logout-all')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, NoGuestGuard)
  logoutAll(@CurrentUser() user: JwtUser) {
    return this.auth.logoutEverywhere(user.sub);
  }

  // Lets the app get a scoped, browse-only token for guests without a
  // sign-up step. Guest tokens are rejected by NoGuestGuard on cart/order/chat.
  @Post('guest')
  guest() {
    return this.auth.guest();
  }
}
