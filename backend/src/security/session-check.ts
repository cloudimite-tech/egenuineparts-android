import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { users } from '../db/schema';

// Every signed-in request checks the account is still active and the token
// hasn't been revoked. Cached briefly per server instance to keep it cheap.
const cache = new Map<string, { at: number; tv: number; ok: boolean; role: string }>();
const TTL = 15_000;

export async function sessionState(userId: string) {
  const hit = cache.get(userId);
  if (hit && Date.now() - hit.at < TTL) return hit;
  const u = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { tokenVersion: true, bannedAt: true, deletedAt: true, role: true },
  });
  const state = { at: Date.now(), tv: u?.tokenVersion ?? -1, ok: !!u && !u.bannedAt && !u.deletedAt, role: u?.role ?? '' };
  cache.set(userId, state);
  if (cache.size > 5000) cache.clear();
  return state;
}

export function forgetSession(userId: string) {
  cache.delete(userId);
}
