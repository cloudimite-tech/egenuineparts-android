// Turns off an admin's authenticator (e.g. lost phone). Their next sign-in at
// /admin walks them through setting it up again.
//   npm run admin:reset-2fa -- <email>
import 'dotenv/config';
import { and, eq, sql } from 'drizzle-orm';
import { db, queryClient } from './client';
import { users } from './schema';

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) {
    console.error('Usage: npm run admin:reset-2fa -- <email>');
    process.exit(1);
  }
  const res = await db
    .update(users)
    .set({ totpSecret: null, totpEnabledAt: null, tokenVersion: sql`${users.tokenVersion} + 1` })
    .where(and(eq(users.email, email), eq(users.role, 'ADMIN')))
    .returning({ id: users.id });
  console.log(res.length ? `Two-step sign-in reset for ${email}. Set it up again at /admin.` : `No admin found with ${email}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => queryClient.end());
