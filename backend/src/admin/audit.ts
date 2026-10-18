import { db } from '../db/client';
import { adminAudit } from '../db/schema';

export async function audit(adminId: string, action: string, targetType?: string, targetId?: string, note?: string) {
  await db.insert(adminAudit).values({ adminId, action, targetType, targetId, note: note?.slice(0, 500) }).catch(() => {});
}
