import { ConflictException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { db } from '../db/client';
import { users } from '../db/schema';
import { sellerStatusFor } from '../common/seller-access';
import { MailService } from '../mail/mail.service';
import { consumeCode, echoCodes, issueCode } from '../security/email-codes';
import { clear, hit, peek } from '../security/rate-limit';
import { forgetSession } from '../security/session-check';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

const norm = (email: string) => email.trim().toLowerCase();
// Compared against when the email doesn't exist, so response time doesn't reveal which emails are registered.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);
// Per-IP limits are generous because Sri Lankan mobile networks put many
// users behind one public IP (carrier NAT); per-account limits do the real work.
const FAIL_WINDOW = 15 * 60;
const MAX_FAILS = 8;

@Injectable()
export class AuthService {
  constructor(
    private readonly jwt: JwtService,
    private readonly mail: MailService,
  ) {}

  private sign(user: { id: string; role: string; email: string; tokenVersion: number }) {
    return this.jwt.sign({ sub: user.id, role: user.role, email: user.email, tv: user.tokenVersion });
  }

  private async session(user: typeof users.$inferSelect) {
    return {
      accessToken: this.sign(user),
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        // Lets the app lock seller accounts until an admin approves them.
        sellerStatus: await sellerStatusFor(user.id, user.role),
      },
    };
  }

  private async sendCode(user: typeof users.$inferSelect, purpose: 'VERIFY_EMAIL' | 'RESET_PASSWORD') {
    const code = await issueCode(user.id, purpose);
    if (code) await this.mail.sendCode(user.email, purpose, code);
    return echoCodes() && code ? code : undefined;
  }

  async register(dto: RegisterDto, ip: string) {
    await hit(`register:${ip}`, 30, 3600, 'Too many sign-ups from this network. Please try again later.');
    const email = norm(dto.email);
    const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
    if (existing) {
      throw new ConflictException(
        existing.emailVerifiedAt
          ? 'An account with this email already exists.'
          : 'An account with this email already exists. Sign in to finish verifying it.',
      );
    }
    if (await db.query.users.findFirst({ where: eq(users.phone, dto.phone) })) {
      throw new ConflictException('This mobile number is already used by another account.');
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const [user] = await db
      .insert(users)
      .values({
        fullName: dto.fullName.trim(),
        email,
        phone: dto.phone,
        passwordHash,
        role: dto.role ?? 'BUYER',
        addressLine1: dto.addressLine1.trim(),
        addressLine2: dto.addressLine2?.trim() || null,
        city: dto.city.trim(),
        district: dto.district,
        termsAcceptedAt: new Date(),
      })
      .returning();
    const devCode = await this.sendCode(user, 'VERIFY_EMAIL');
    return { needsVerification: true, email, ...(devCode ? { devCode } : {}) };
  }

  async verifyEmail(emailRaw: string, code: string, ip: string) {
    await hit(`verify:${ip}`, 120, 900);
    const user = await db.query.users.findFirst({ where: and(eq(users.email, norm(emailRaw)), isNull(users.deletedAt)) });
    if (!user) throw new UnauthorizedException({ message: 'That code isn’t right. Check the email and try again.', code: 'CODE_INVALID' });
    if (!user.emailVerifiedAt) {
      await consumeCode(user.id, 'VERIFY_EMAIL', code);
      await db.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, user.id));
      user.emailVerifiedAt = new Date();
    }
    if (user.bannedAt) throw new ForbiddenException({ message: 'This account has been suspended. Contact support@autoguide.lk.', code: 'BANNED' });
    return this.session(user);
  }

  async resendVerification(emailRaw: string, ip: string) {
    await hit(`resend:${ip}`, 60, 3600);
    const user = await db.query.users.findFirst({ where: and(eq(users.email, norm(emailRaw)), isNull(users.deletedAt)) });
    let devCode: string | undefined;
    if (user && !user.emailVerifiedAt) devCode = await this.sendCode(user, 'VERIFY_EMAIL');
    // Same answer whether or not the account exists (no account probing).
    return { sent: true, ...(devCode ? { devCode } : {}) };
  }

  async login(dto: LoginDto, ip: string) {
    const email = norm(dto.email);
    await hit(`login-ip:${ip}`, 150, FAIL_WINDOW);
    if ((await peek(`login-fail:${email}`, FAIL_WINDOW)) >= MAX_FAILS) {
      throw new UnauthorizedException({ message: 'Too many failed attempts. Wait 15 minutes or reset your password.', code: 'LOCKED' });
    }
    const user = await db.query.users.findFirst({ where: and(eq(users.email, email), isNull(users.deletedAt)) });
    const valid = user ? await bcrypt.compare(dto.password, user.passwordHash) : await bcrypt.compare(dto.password, DUMMY_HASH);
    if (!user || !valid) {
      await hit(`login-fail:${email}`, 1_000_000, FAIL_WINDOW);
      throw new UnauthorizedException({ message: 'Invalid email or password.', code: 'INVALID_CREDENTIALS' });
    }
    await clear(`login-fail:${email}`);
    if (user.role === 'ADMIN') {
      throw new ForbiddenException({ message: 'Admin accounts sign in on the web admin panel, not in the app.', code: 'ADMIN_USE_WEB' });
    }
    if (user.bannedAt) {
      throw new ForbiddenException({ message: 'This account has been suspended. Contact support@autoguide.lk.', code: 'BANNED' });
    }
    if (!user.emailVerifiedAt) {
      const devCode = await this.sendCode(user, 'VERIFY_EMAIL');
      throw new ForbiddenException({
        message: 'Please verify your email first. We’ve sent you a code.',
        code: 'EMAIL_NOT_VERIFIED',
        email: user.email,
        ...(devCode ? { devCode } : {}),
      });
    }
    return this.session(user);
  }

  async forgotPassword(emailRaw: string, ip: string) {
    await hit(`forgot:${ip}`, 40, 3600);
    const user = await db.query.users.findFirst({ where: and(eq(users.email, norm(emailRaw)), isNull(users.deletedAt)) });
    let devCode: string | undefined;
    if (user && user.role !== 'ADMIN') devCode = await this.sendCode(user, 'RESET_PASSWORD');
    return { sent: true, ...(devCode ? { devCode } : {}) };
  }

  async resetPassword(emailRaw: string, code: string, password: string, ip: string) {
    await hit(`reset:${ip}`, 80, 900);
    const user = await db.query.users.findFirst({ where: and(eq(users.email, norm(emailRaw)), isNull(users.deletedAt)) });
    if (!user || user.role === 'ADMIN') throw new UnauthorizedException({ message: 'That code isn’t right. Check the email and try again.', code: 'CODE_INVALID' });
    await consumeCode(user.id, 'RESET_PASSWORD', code);
    await db
      .update(users)
      .set({
        passwordHash: await bcrypt.hash(password, 10),
        // Proving access to the inbox also verifies the email.
        emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
        // Sign out every device that was using the old password.
        tokenVersion: sql`${users.tokenVersion} + 1`,
      })
      .where(eq(users.id, user.id));
    forgetSession(user.id);
    await clear(`login-fail:${user.email}`);
    return { reset: true };
  }

  async logoutEverywhere(userId: string) {
    await db.update(users).set({ tokenVersion: sql`${users.tokenVersion} + 1` }).where(eq(users.id, userId));
    forgetSession(userId);
    return { signedOut: true };
  }

  guest() {
    const guestId = `guest_${Math.random().toString(36).slice(2, 12)}`;
    const accessToken = this.jwt.sign({ sub: guestId, role: 'GUEST' }, { expiresIn: '7d' });
    return { accessToken, user: { id: guestId, role: 'GUEST' } };
  }
}
