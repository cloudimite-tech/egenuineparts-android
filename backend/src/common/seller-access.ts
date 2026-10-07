import { ForbiddenException } from '@nestjs/common';
import { eq, inArray } from 'drizzle-orm';
import { db } from '../db/client';
import { stores, users } from '../db/schema';

export const SRI_LANKA_DISTRICTS = [
  'Ampara', 'Anuradhapura', 'Badulla', 'Batticaloa', 'Colombo', 'Galle', 'Gampaha', 'Hambantota',
  'Jaffna', 'Kalutara', 'Kandy', 'Kegalle', 'Kilinochchi', 'Kurunegala', 'Mannar', 'Matale', 'Matara',
  'Monaragala', 'Mullaitivu', 'Nuwara Eliya', 'Polonnaruwa', 'Puttalam', 'Ratnapura', 'Trincomalee', 'Vavuniya',
];

export type SellerStatus = 'NOT_SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';

/** Seller application status for a user, or null for non-sellers. */
export async function sellerStatusFor(userId: string, role?: string): Promise<SellerStatus | null> {
  if (!role) {
    const u = await db.query.users.findFirst({ where: eq(users.id, userId), columns: { role: true } });
    role = u?.role;
  }
  if (role !== 'SELLER') return null;
  const store = await db.query.stores.findFirst({ where: eq(stores.ownerId, userId), columns: { status: true } });
  return store?.status ?? 'NOT_SUBMITTED';
}

/** The caller's store, only if an admin has approved it. */
export async function requireApprovedStore(userId: string) {
  const store = await db.query.stores.findFirst({ where: eq(stores.ownerId, userId) });
  if (!store) throw new ForbiddenException('Complete your seller application first.');
  if (store.status === 'PENDING') throw new ForbiddenException('Your store is waiting for admin approval.');
  if (store.status !== 'APPROVED') throw new ForbiddenException('Your store is not active. Please contact support.');
  return store;
}

/** SQL condition: row belongs to an approved store (for catalogue queries). */
export function fromApprovedStore(storeIdColumn: any) {
  return inArray(storeIdColumn, db.select({ id: stores.id }).from(stores).where(eq(stores.status, 'APPROVED')));
}
