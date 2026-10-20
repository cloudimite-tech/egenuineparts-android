import { and, eq, isNull, lt, ne } from 'drizzle-orm';
import { db } from '../db/client';
import { emailCodes, users } from '../db/schema';

// A sign-up only "owns" its email and mobile number once the email is verified.
// Unverified sign-ups (e.g. someone mistyped their email and never got the code)
// are released, so the person can simply sign up again with the right details.

type Row = typeof users.$inferSelect;

export async function releaseUnverified(u: Pick<Row, 'id'>) {
  await db.delete(emailCodes).where(eq(emailCodes.userId, u.id));
  try {
    // Nothing else can point at an account that never signed in.
    await db.delete(users).where(and(eq(users.id, u.id), isNull(users.emailVerifiedAt)));
  } catch {
    // Something references it after all: keep the row but free the email and number.
    await db
      .update(users)
      .set({ email: `unverified-${u.id}@deleted.invalid`, phone: null, deletedAt: new Date() })
      .where(and(eq(users.id, u.id), isNull(users.emailVerifiedAt)));
  }
}

/** Unverified sign-ups older than 3 days are removed (runs with the hourly cleanup). */
export async function releaseStaleSignups() {
  const cutoff = new Date(Date.now() - 3 * 86400000);
  const stale = await db
    .select({ id: users.id })
    .from(users)
    .where(and(isNull(users.emailVerifiedAt), isNull(users.deletedAt), ne(users.role, 'ADMIN'), lt(users.createdAt, cutoff)))
    .limit(200);
  for (const u of stale) await releaseUnverified(u);
}
