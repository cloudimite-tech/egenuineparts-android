import { BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { createHmac, randomInt, timingSafeEqual } from 'crypto';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { db } from '../db/client';
import { emailCodes } from '../db/schema';
import { hit } from './rate-limit';

type Purpose = 'VERIFY_EMAIL' | 'RESET_PASSWORD' | 'CHANGE_EMAIL';
const TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 60 * 1000;

const hash = (code: string) => createHmac('sha256', process.env.JWT_SECRET || 'dev-secret-change-me').update(code).digest('hex');

/**
 * Creates a fresh 6-digit code (older unused ones stop working).
 * Returns null if one was sent less than a minute ago.
 */
export async function issueCode(userId: string, purpose: Purpose): Promise<string | null> {
  const last = await db.query.emailCodes.findFirst({
    where: and(eq(emailCodes.userId, userId), eq(emailCodes.purpose, purpose)),
    orderBy: desc(emailCodes.createdAt),
  });
  if (last && !last.consumedAt && Date.now() - last.createdAt.getTime() < RESEND_COOLDOWN_MS) return null;
  await hit(`code:${purpose}:${userId}`, 6, 3600, 'Too many codes requested. Please try again in an hour.');
  await db
    .update(emailCodes)
    .set({ consumedAt: new Date() })
    .where(and(eq(emailCodes.userId, userId), eq(emailCodes.purpose, purpose), isNull(emailCodes.consumedAt)));
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  await db.insert(emailCodes).values({ userId, purpose, codeHash: hash(code), expiresAt: new Date(Date.now() + TTL_MS) });
  return code;
}

/** Checks (and uses up) a code. Throws a friendly error when it's wrong. */
export async function consumeCode(userId: string, purpose: Purpose, code: string) {
  const row = await db.query.emailCodes.findFirst({
    where: and(eq(emailCodes.userId, userId), eq(emailCodes.purpose, purpose), isNull(emailCodes.consumedAt)),
    orderBy: desc(emailCodes.createdAt),
  });
  if (!row || row.expiresAt.getTime() < Date.now()) {
    throw new BadRequestException({ message: 'This code has expired. Request a new one.', code: 'CODE_EXPIRED' });
  }
  if (row.attempts >= MAX_ATTEMPTS) {
    throw new HttpException({ message: 'Too many wrong attempts. Request a new code.', code: 'CODE_LOCKED' }, HttpStatus.TOO_MANY_REQUESTS);
  }
  const ok = /^\d{6}$/.test(code ?? '') && timingSafeEqual(Buffer.from(hash(code)), Buffer.from(row.codeHash));
  if (!ok) {
    await db.update(emailCodes).set({ attempts: row.attempts + 1 }).where(eq(emailCodes.id, row.id));
    throw new BadRequestException({ message: 'That code isn’t right. Check the email and try again.', code: 'CODE_INVALID' });
  }
  await db.update(emailCodes).set({ consumedAt: new Date() }).where(eq(emailCodes.id, row.id));
}

/** Test-only: lets the automated tests read the code (never on Vercel). */
export const echoCodes = () => process.env.OTP_TEST_ECHO === '1' && !process.env.VERCEL;
