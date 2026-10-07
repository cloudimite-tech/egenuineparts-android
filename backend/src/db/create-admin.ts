// Creates an admin account, or promotes an existing account to admin.
//   npm run admin:create -- <email> <password> "<Full name>"
// Against production:  DATABASE_URL="<neon url>" npm run admin:create -- ...
import 'dotenv/config';
import * as bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db, queryClient } from './client';
import { users } from './schema';

async function main() {
  const [emailArg, password, ...nameParts] = process.argv.slice(2);
  const email = emailArg?.trim().toLowerCase();
  const fullName = nameParts.join(' ').trim() || 'Admin';
  if (!email || !/^\S+@\S+\.\S+$/.test(email) || !password) {
    console.error('Usage: npm run admin:create -- <email> <password> "<Full name>"');
    process.exit(1);
  }
  if (password.length < 10) {
    console.error('Use an admin password of at least 10 characters.');
    process.exit(1);
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (existing) {
    await db.update(users).set({ role: 'ADMIN', passwordHash }).where(eq(users.id, existing.id));
    console.log(`Promoted ${email} to ADMIN (password updated). Sign out and back in on the app.`);
  } else {
    await db.insert(users).values({ email, passwordHash, fullName, role: 'ADMIN' });
    console.log(`Created admin ${email}.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => queryClient.end());
