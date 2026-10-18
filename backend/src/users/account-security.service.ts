import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { and, eq, isNull, ne, sql } from 'drizzle-orm';
import { db } from '../db/client';
import { users } from '../db/schema';
import { MailService } from '../mail/mail.service';
import { consumeCode, echoCodes, issueCode } from '../security/email-codes';
import { hit } from '../security/rate-limit';
import { forgetSession } from '../security/session-check';

// Signed-in account settings for app users: change password / change email.
@Injectable()
export class AccountSecurityService {
  constructor(
    private readonly jwt: JwtService,
    private readonly mail: MailService,
  ) {}

  private async user(userId: string) {
    const u = await db.query.users.findFirst({ where: and(eq(users.id, userId), isNull(users.deletedAt)) });
    if (!u) throw new UnauthorizedException();
    return u;
  }

  private async checkPassword(userId: string, password: string) {
    await hit(`pw-check:${userId}`, 10, 900, 'Too many attempts. Please wait 15 minutes.');
    const u = await this.user(userId);
    if (!(await bcrypt.compare(password ?? '', u.passwordHash))) {
      throw new UnauthorizedException({ message: 'Your current password is incorrect.', code: 'INVALID_CREDENTIALS' });
    }
    return u;
  }

  /** New token for THIS device after other sessions were revoked. */
  private session(u: { id: string; role: string; email: string }, tokenVersion: number) {
    return this.jwt.sign({ sub: u.id, role: u.role, email: u.email, tv: tokenVersion });
  }

  async changePassword(userId: string, current: string, next: string) {
    const u = await this.checkPassword(userId, current);
    if (current === next) throw new BadRequestException('Choose a password you haven’t used here before.');
    const [row] = await db
      .update(users)
      .set({ passwordHash: await bcrypt.hash(next, 10), tokenVersion: sql`${users.tokenVersion} + 1` })
      .where(eq(users.id, userId))
      .returning({ tokenVersion: users.tokenVersion });
    forgetSession(userId);
    await this.mail.sendNotice(u.email, 'Your password was changed', 'The password for your AutoGuide account was just changed. Other devices have been signed out.');
    return { changed: true, accessToken: this.session(u, row.tokenVersion) };
  }

  async requestEmailChange(userId: string, newEmailRaw: string, password: string) {
    const u = await this.checkPassword(userId, password);
    const newEmail = newEmailRaw.trim().toLowerCase();
    if (newEmail === u.email) throw new BadRequestException('That’s already your email.');
    if (await db.query.users.findFirst({ where: and(eq(users.email, newEmail), ne(users.id, userId)) })) {
      throw new ConflictException('Another account already uses this email.');
    }
    await db.update(users).set({ pendingEmail: newEmail }).where(eq(users.id, userId));
    const code = await issueCode(userId, 'CHANGE_EMAIL');
    if (code) await this.mail.sendCode(newEmail, 'CHANGE_EMAIL', code);
    return { sent: true, email: newEmail, ...(echoCodes() && code ? { devCode: code } : {}) };
  }

  async confirmEmailChange(userId: string, code: string) {
    const u = await this.user(userId);
    if (!u.pendingEmail) throw new BadRequestException('Start the email change again.');
    await consumeCode(userId, 'CHANGE_EMAIL', code);
    if (await db.query.users.findFirst({ where: and(eq(users.email, u.pendingEmail), ne(users.id, userId)) })) {
      throw new ConflictException('Another account already uses this email.');
    }
    const oldEmail = u.email;
    const [row] = await db
      .update(users)
      .set({ email: u.pendingEmail, pendingEmail: null, emailVerifiedAt: new Date(), tokenVersion: sql`${users.tokenVersion} + 1` })
      .where(eq(users.id, userId))
      .returning({ tokenVersion: users.tokenVersion, email: users.email });
    forgetSession(userId);
    await this.mail.sendNotice(oldEmail, 'Your email was changed', `Your AutoGuide account email was changed to ${row.email}. Other devices have been signed out.`);
    return { changed: true, email: row.email, accessToken: this.session({ ...u, email: row.email }, row.tokenVersion) };
  }
}
