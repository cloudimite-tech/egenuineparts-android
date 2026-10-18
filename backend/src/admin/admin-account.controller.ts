import { BadRequestException, Body, ConflictException, Controller, Get, HttpCode, Patch, Post, UnauthorizedException, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import * as bcrypt from 'bcryptjs';
import { and, eq, ne, sql } from 'drizzle-orm';
import * as QRCode from 'qrcode';
import { db } from '../db/client';
import { users } from '../db/schema';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { hit } from '../security/rate-limit';
import { newTotpSecret, otpauthUrl, verifyTotp } from '../security/totp';
import { forgetSession } from '../security/session-check';
import { MailService } from '../mail/mail.service';
import { audit } from './audit';

const SIX = /^\d{6}$/;
const CODE_MSG = 'Enter the 6-digit code from your authenticator app.';
class ProfileDto {
  @IsString() @MinLength(2) @MaxLength(255) fullName: string;
}
class PasswordDto {
  @IsString() currentPassword: string;
  @IsString() @MinLength(10, { message: 'Admin passwords need at least 10 characters.' }) newPassword: string;
  @IsString() @Matches(SIX, { message: CODE_MSG }) code: string;
}
class EmailDto {
  @IsEmail() newEmail: string;
  @IsString() password: string;
  @IsString() @Matches(SIX, { message: CODE_MSG }) code: string;
}
class StepUpDto {
  @IsString() password: string;
  @IsString() @Matches(SIX, { message: CODE_MSG }) code: string;
}
class ConfirmDto {
  @IsString() @Matches(SIX, { message: 'Enter the 6-digit code from your NEW authenticator.' }) code: string;
}

// The signed-in admin's own account: profile, password, email, authenticator.
// Every sensitive change needs the current password + an authenticator code.
@Controller('admin/account')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminAccountController {
  constructor(
    private readonly jwt: JwtService,
    private readonly mail: MailService,
  ) {}

  private async me(id: string) {
    const u = await db.query.users.findFirst({ where: eq(users.id, id) });
    if (!u || u.role !== 'ADMIN') throw new UnauthorizedException();
    return u;
  }

  private async stepUp(id: string, password: string, code: string) {
    await hit(`admin-stepup:${id}`, 8, 900, 'Too many attempts. Please wait 15 minutes.');
    const u = await this.me(id);
    if (!(await bcrypt.compare(password ?? '', u.passwordHash))) throw new UnauthorizedException('Your current password is incorrect.');
    if (!u.totpSecret || !verifyTotp(u.totpSecret, code)) throw new UnauthorizedException('That authenticator code isn’t right.');
    return u;
  }

  private issue(u: { id: string; email: string }, tokenVersion: number) {
    return this.jwt.sign({ sub: u.id, role: 'ADMIN', email: u.email, tv: tokenVersion, aud: 'admin' }, { expiresIn: '8h' });
  }

  @Get()
  async get(@CurrentUser() cu: JwtUser) {
    const u = await this.me(cu.sub);
    return { id: u.id, fullName: u.fullName, email: u.email, totpEnabledAt: u.totpEnabledAt, createdAt: u.createdAt };
  }

  @Patch('profile')
  async profile(@CurrentUser() cu: JwtUser, @Body() dto: ProfileDto) {
    await db.update(users).set({ fullName: dto.fullName.trim() }).where(eq(users.id, cu.sub));
    await audit(cu.sub, 'admin_profile_updated');
    return this.get(cu);
  }

  @Post('password')
  @HttpCode(200)
  async password(@CurrentUser() cu: JwtUser, @Body() dto: PasswordDto) {
    const u = await this.stepUp(cu.sub, dto.currentPassword, dto.code);
    if (dto.currentPassword === dto.newPassword) throw new BadRequestException('Choose a new password.');
    const [row] = await db
      .update(users)
      .set({ passwordHash: await bcrypt.hash(dto.newPassword, 10), tokenVersion: sql`${users.tokenVersion} + 1` })
      .where(eq(users.id, u.id))
      .returning({ tv: users.tokenVersion });
    forgetSession(u.id);
    await audit(u.id, 'admin_password_changed');
    await this.mail.sendNotice(u.email, 'Admin password changed', 'The password for your AutoGuide admin account was just changed. Other admin sessions have been signed out.');
    return { changed: true, accessToken: this.issue(u, row.tv) };
  }

  @Post('email')
  @HttpCode(200)
  async email(@CurrentUser() cu: JwtUser, @Body() dto: EmailDto) {
    const u = await this.stepUp(cu.sub, dto.password, dto.code);
    const newEmail = dto.newEmail.trim().toLowerCase();
    if (newEmail === u.email) throw new BadRequestException('That’s already your email.');
    if (await db.query.users.findFirst({ where: and(eq(users.email, newEmail), ne(users.id, u.id)) })) {
      throw new ConflictException('Another account already uses this email.');
    }
    const [row] = await db
      .update(users)
      .set({ email: newEmail, tokenVersion: sql`${users.tokenVersion} + 1` })
      .where(eq(users.id, u.id))
      .returning({ tv: users.tokenVersion });
    forgetSession(u.id);
    await audit(u.id, 'admin_email_changed', 'user', u.id, `${u.email} → ${newEmail}`);
    await this.mail.sendNotice(u.email, 'Admin email changed', `Your AutoGuide admin sign-in email was changed to ${newEmail}.`);
    return { changed: true, email: newEmail, accessToken: this.issue({ ...u, email: newEmail }, row.tv) };
  }

  // Move to a new phone / authenticator app: verify the old one, then confirm the new one.
  @Post('2fa/start')
  @HttpCode(200)
  async start2fa(@CurrentUser() cu: JwtUser, @Body() dto: StepUpDto) {
    const u = await this.stepUp(cu.sub, dto.password, dto.code);
    const secret = newTotpSecret();
    await db.update(users).set({ totpPendingSecret: secret }).where(eq(users.id, u.id));
    const url = otpauthUrl(secret, u.email);
    return { secret, otpauthUrl: url, qrSvg: await QRCode.toString(url, { type: 'svg', margin: 1, width: 220 }) };
  }

  @Post('2fa/confirm')
  @HttpCode(200)
  async confirm2fa(@CurrentUser() cu: JwtUser, @Body() dto: ConfirmDto) {
    const u = await this.me(cu.sub);
    if (!u.totpPendingSecret || !verifyTotp(u.totpPendingSecret, dto.code)) {
      throw new UnauthorizedException('That code isn’t right. Make sure you scanned the new QR code.');
    }
    await db.update(users).set({ totpSecret: u.totpPendingSecret, totpPendingSecret: null, totpEnabledAt: new Date() }).where(eq(users.id, u.id));
    await audit(u.id, 'admin_2fa_changed');
    await this.mail.sendNotice(u.email, 'Authenticator changed', 'The authenticator app for your AutoGuide admin account was changed.');
    return { changed: true };
  }

  @Post('logout-all')
  @HttpCode(200)
  async logoutAll(@CurrentUser() cu: JwtUser) {
    await db.update(users).set({ tokenVersion: sql`${users.tokenVersion} + 1` }).where(eq(users.id, cu.sub));
    forgetSession(cu.sub);
    await audit(cu.sub, 'admin_logout_all');
    return { signedOut: true };
  }
}
