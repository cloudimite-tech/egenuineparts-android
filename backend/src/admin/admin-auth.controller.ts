import { Body, Controller, Get, HttpCode, Post, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { IsEmail, IsOptional, IsString, Matches } from 'class-validator';
import * as bcrypt from 'bcryptjs';
import { and, eq, isNull } from 'drizzle-orm';
import * as QRCode from 'qrcode';
import { db } from '../db/client';
import { users } from '../db/schema';
import { clear, clientIp, hit, peek } from '../security/rate-limit';
import { newTotpSecret, otpauthUrl, verifyTotp } from '../security/totp';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { audit } from './audit';

class AdminLoginDto {
  @IsEmail() email: string;
  @IsString() password: string;
  @IsOptional() @IsString() @Matches(/^\d{6}$/, { message: 'Enter the 6-digit code from your authenticator app.' }) code?: string;
}
class SetupDto {
  @IsString() setupToken: string;
}
class ConfirmDto {
  @IsString() setupToken: string;
  @IsString() @Matches(/^\d{6}$/, { message: 'Enter the 6-digit code from your authenticator app.' }) code: string;
}

const SESSION_HOURS = 8;

// Web admin panel sign-in: password + authenticator-app code (2-step).
// The first sign-in walks the admin through setting up the authenticator.
@Controller('admin/auth')
export class AdminAuthController {
  constructor(private readonly jwt: JwtService) {}

  private issue(user: typeof users.$inferSelect) {
    return {
      accessToken: this.jwt.sign({ sub: user.id, role: 'ADMIN', email: user.email, tv: user.tokenVersion, aud: 'admin' }, { expiresIn: `${SESSION_HOURS}h` }),
      admin: { id: user.id, email: user.email, fullName: user.fullName },
      expiresInHours: SESSION_HOURS,
    };
  }

  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: AdminLoginDto, @Req() req: any) {
    const email = dto.email.trim().toLowerCase();
    await hit(`admin-login-ip:${clientIp(req)}`, 20, 900);
    if ((await peek(`admin-fail:${email}`, 900)) >= 5) {
      throw new UnauthorizedException('Too many failed attempts. Try again in 15 minutes.');
    }
    const user = await db.query.users.findFirst({ where: and(eq(users.email, email), isNull(users.deletedAt)) });
    const ok = user && user.role === 'ADMIN' && !user.bannedAt && (await bcrypt.compare(dto.password, user.passwordHash));
    if (!ok) {
      await hit(`admin-fail:${email}`, 1_000_000, 900);
      throw new UnauthorizedException('Invalid email or password.');
    }
    if (!user.totpEnabledAt || !user.totpSecret) {
      // First sign-in: must set up the authenticator app before getting in.
      const setupToken = this.jwt.sign({ sub: user.id, typ: 'admin-2fa-setup' }, { expiresIn: '15m' });
      return { needs2faSetup: true, setupToken };
    }
    if (!dto.code) return { needs2faCode: true };
    if (!verifyTotp(user.totpSecret, dto.code)) {
      await hit(`admin-fail:${email}`, 1_000_000, 900);
      throw new UnauthorizedException('That authenticator code isn’t right.');
    }
    await clear(`admin-fail:${email}`);
    await audit(user.id, 'admin_login');
    return this.issue(user);
  }

  private async setupUser(token: string) {
    let payload: any;
    try {
      payload = this.jwt.verify(token);
    } catch {
      throw new UnauthorizedException('Setup expired. Sign in again.');
    }
    if (payload?.typ !== 'admin-2fa-setup') throw new UnauthorizedException('Setup expired. Sign in again.');
    const user = await db.query.users.findFirst({ where: eq(users.id, payload.sub) });
    if (!user || user.role !== 'ADMIN' || user.totpEnabledAt) throw new UnauthorizedException('Setup expired. Sign in again.');
    return user;
  }

  @Post('2fa/setup')
  @HttpCode(200)
  async setup(@Body() dto: SetupDto) {
    const user = await this.setupUser(dto.setupToken);
    const secret = newTotpSecret();
    await db.update(users).set({ totpSecret: secret }).where(eq(users.id, user.id));
    const url = otpauthUrl(secret, user.email);
    return { secret, otpauthUrl: url, qrSvg: await QRCode.toString(url, { type: 'svg', margin: 1, width: 220 }) };
  }

  @Post('2fa/confirm')
  @HttpCode(200)
  async confirm(@Body() dto: ConfirmDto) {
    const user = await this.setupUser(dto.setupToken);
    if (!user.totpSecret || !verifyTotp(user.totpSecret, dto.code)) throw new UnauthorizedException('That code isn’t right. Check the time on your phone and try again.');
    await db.update(users).set({ totpEnabledAt: new Date() }).where(eq(users.id, user.id));
    await audit(user.id, 'admin_2fa_enabled');
    await audit(user.id, 'admin_login');
    return this.issue({ ...user, totpEnabledAt: new Date() });
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async me(@CurrentUser() u: JwtUser) {
    const user = await db.query.users.findFirst({ where: eq(users.id, u.sub), columns: { id: true, email: true, fullName: true } });
    return user;
  }
}
