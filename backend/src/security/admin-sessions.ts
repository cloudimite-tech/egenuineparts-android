import { and, eq, gt, isNull, ne } from 'drizzle-orm';
import { db } from '../db/client';
import { adminSessions } from '../db/schema';
import { clientIp } from './rate-limit';

export const ADMIN_SESSION_HOURS = 8;

// One row per signed-in admin device. The admin JWT carries its id (sid);
// every admin request checks the row is still live, so a single device can be
// signed out from Settings. Cached briefly per server instance.
const cache = new Map<string, { at: number; ok: boolean; seen: number }>();
const TTL = 5_000;
const SEEN_EVERY = 5 * 60_000;

function header(req: any, name: string) {
  const v = req?.headers?.[name];
  return typeof v === 'string' ? v : undefined;
}

export async function createAdminSession(userId: string, req: any) {
  const city = header(req, 'x-vercel-ip-city');
  const country = header(req, 'x-vercel-ip-country');
  const location = [city ? decodeURIComponent(city) : null, country].filter(Boolean).join(', ') || null;
  const [row] = await db
    .insert(adminSessions)
    .values({
      userId,
      userAgent: (header(req, 'user-agent') ?? '').slice(0, 400) || null,
      ip: clientIp(req).slice(0, 64),
      location,
      expiresAt: new Date(Date.now() + ADMIN_SESSION_HOURS * 3600_000),
    })
    .returning({ id: adminSessions.id });
  return row.id;
}

export async function adminSessionLive(sid: string, userId: string): Promise<boolean> {
  const hit = cache.get(sid);
  if (hit && Date.now() - hit.at < TTL) return hit.ok;
  const row = await db.query.adminSessions.findFirst({ where: and(eq(adminSessions.id, sid), eq(adminSessions.userId, userId)) });
  const ok = !!row && !row.revokedAt && row.expiresAt > new Date();
  const seen = row?.lastSeenAt?.getTime() ?? 0;
  cache.set(sid, { at: Date.now(), ok, seen });
  if (cache.size > 2000) cache.clear();
  if (ok && Date.now() - seen > SEEN_EVERY) {
    await db.update(adminSessions).set({ lastSeenAt: new Date() }).where(eq(adminSessions.id, sid)).catch(() => {});
  }
  return ok;
}

export async function listAdminSessions(userId: string) {
  return db.query.adminSessions.findMany({
    where: and(eq(adminSessions.userId, userId), isNull(adminSessions.revokedAt), gt(adminSessions.expiresAt, new Date())),
    orderBy: (s, { desc }) => desc(s.lastSeenAt),
  });
}

export async function revokeAdminSession(userId: string, sid: string) {
  const res = await db
    .update(adminSessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(adminSessions.id, sid), eq(adminSessions.userId, userId), isNull(adminSessions.revokedAt)))
    .returning({ id: adminSessions.id });
  cache.delete(sid);
  return res.length > 0;
}

// Every session of this admin except `keep` (or all when keep is null).
export async function revokeOtherAdminSessions(userId: string, keep: string | null) {
  const where = keep
    ? and(eq(adminSessions.userId, userId), isNull(adminSessions.revokedAt), ne(adminSessions.id, keep))
    : and(eq(adminSessions.userId, userId), isNull(adminSessions.revokedAt));
  const rows = await db.update(adminSessions).set({ revokedAt: new Date() }).where(where).returning({ id: adminSessions.id });
  rows.forEach((r) => cache.delete(r.id));
}

// "Chrome on macOS" from a user-agent string - good enough for a device list.
export function describeDevice(ua?: string | null) {
  const s = ua ?? '';
  const browser = /Edg\//.test(s) ? 'Edge' : /OPR\/|Opera/.test(s) ? 'Opera' : /Brave/.test(s) ? 'Brave' : /Firefox\//.test(s) ? 'Firefox' : /Chrome\//.test(s) ? 'Chrome' : /Safari\//.test(s) ? 'Safari' : 'Browser';
  const os = /iPhone|iPad|iPod/.test(s) ? 'iOS' : /Android/.test(s) ? 'Android' : /Mac OS X|Macintosh/.test(s) ? 'macOS' : /Windows/.test(s) ? 'Windows' : /Linux/.test(s) ? 'Linux' : 'Unknown device';
  const mobile = /Mobile|iPhone|Android/.test(s);
  return { browser, os, mobile, label: `${browser} on ${os}` };
}
