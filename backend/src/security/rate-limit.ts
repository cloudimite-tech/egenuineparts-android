import { HttpException, HttpStatus } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { db } from '../db/client';
import { rateLimits } from '../db/schema';

// Fixed-window rate limiting stored in Postgres, so every serverless
// instance shares the same counters (no Redis needed on Vercel Hobby).
export async function hit(key: string, limit: number, windowSec: number, message = 'Too many attempts. Please wait a few minutes and try again.') {
  const rows = await db.execute(sql`
    INSERT INTO rate_limits (key, count, window_start) VALUES (${key}, 1, now())
    ON CONFLICT (key) DO UPDATE SET
      count = CASE WHEN rate_limits.window_start < now() - (${windowSec} * interval '1 second') THEN 1 ELSE rate_limits.count + 1 END,
      window_start = CASE WHEN rate_limits.window_start < now() - (${windowSec} * interval '1 second') THEN now() ELSE rate_limits.window_start END
    RETURNING count`);
  const count = Number((rows as any)[0]?.count ?? (rows as any).rows?.[0]?.count ?? 0);
  if (count > limit) throw new HttpException({ message, code: 'RATE_LIMITED' }, HttpStatus.TOO_MANY_REQUESTS);
  return count;
}

/** Current count without incrementing (e.g. "too many failed logins?"). */
export async function peek(key: string, windowSec: number) {
  const row = await db.query.rateLimits.findFirst({ where: eq(rateLimits.key, key) });
  if (!row || row.windowStart.getTime() < Date.now() - windowSec * 1000) return 0;
  return row.count;
}

export async function clear(key: string) {
  await db.delete(rateLimits).where(eq(rateLimits.key, key));
}

/** Best-effort client IP behind Vercel's proxy. */
export function clientIp(req: any): string {
  const fwd = (req?.headers?.['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim();
  return fwd || (req?.headers?.['x-real-ip'] as string) || req?.ip || 'unknown';
}
