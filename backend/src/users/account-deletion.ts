import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { and, eq, inArray, or, sql } from 'drizzle-orm';
import { db } from '../db/client';
import {
  appointments, cartItems, emailCodes, orderItems, orders, products, sellerDocuments, stores, userBlocks, users, vehicles, wishlistItems,
} from '../db/schema';
import { forgetSession } from '../security/session-check';

const OPEN = ['PENDING', 'PAID', 'SHIPPED'] as const;

/**
 * Deletes an account (Google Play requirement), used by the app and by the
 * public web form. Personal details, verification documents, garage, cart and
 * wishlist are erased; the store is closed. Order records are kept with the
 * buyer anonymised, because sellers need them for accounting and disputes
 * (disclosed in the privacy policy). Messages and reviews remain, shown as
 * "Deleted user".
 */
export async function deleteAccount(userId: string, password: string) {
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user || user.deletedAt) throw new UnauthorizedException('Account not found.');
  if (!(await bcrypt.compare(password ?? '', user.passwordHash))) {
    throw new UnauthorizedException({ message: 'Incorrect password.', code: 'INVALID_CREDENTIALS' });
  }
  return eraseAccount(userId);
}

/** Same erase, started by an admin from the admin panel (no password). */
export async function eraseAccount(userId: string, opts: { byAdmin?: boolean } = {}) {
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user || user.deletedAt) throw new BadRequestException('This account has already been deleted.');
  if (user.role === 'ADMIN') throw new BadRequestException('Admin accounts can’t be deleted here.');

  // Unfinished orders must be completed or cancelled first.
  const [buyerOpen] = await db
    .select({ n: sql<number>`count(*)` })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .where(and(eq(orders.buyerId, userId), inArray(orderItems.fulfillmentStatus, [...OPEN])));
  const store = await db.query.stores.findFirst({ where: eq(stores.ownerId, userId) });
  const [sellerOpen] = store
    ? await db.select({ n: sql<number>`count(*)` }).from(orderItems).where(and(eq(orderItems.storeId, store.id), inArray(orderItems.fulfillmentStatus, [...OPEN])))
    : [{ n: 0 }];
  if (Number(buyerOpen.n) > 0 || Number(sellerOpen.n) > 0) {
    throw new BadRequestException({
      message: opts.byAdmin
        ? 'This user has orders that aren’t finished yet. Once they’re delivered or cancelled the account can be deleted - ban the user meanwhile if needed.'
        : 'You have orders that aren’t finished yet. Once they’re delivered or cancelled, you can delete your account.',
      code: 'OPEN_ORDERS',
    });
  }

  // Open appointment requests the person made are cancelled.
  await db.update(appointments).set({ status: 'CANCELLED', respondedAt: new Date() })
    .where(and(eq(appointments.buyerId, userId), inArray(appointments.status, ['REQUESTED', 'ACCEPTED'])));
  await db.delete(cartItems).where(eq(cartItems.userId, userId));
  await db.delete(wishlistItems).where(eq(wishlistItems.userId, userId));
  await db.delete(vehicles).where(eq(vehicles.userId, userId));
  await db.delete(emailCodes).where(eq(emailCodes.userId, userId));
  await db.delete(userBlocks).where(or(eq(userBlocks.blockerId, userId), eq(userBlocks.blockedId, userId)));
  if (store) {
    await db.update(products).set({ isActive: false }).where(eq(products.storeId, store.id));
    await db
      .update(stores)
      .set({
        status: 'SUSPENDED', verified: false, reviewNote: opts.byAdmin ? 'Account deleted by AutoGuide.' : 'Account deleted by its owner.',
        nicNumber: null, nicFrontDocumentId: null, nicBackDocumentId: null, selfieDocumentId: null, brDocumentId: null,
        contactPhone: null, addressLine1: null, addressLine2: null, latitude: null, longitude: null, logoUrl: null,
      })
      .where(eq(stores.id, store.id));
  }
  await db.delete(sellerDocuments).where(eq(sellerDocuments.ownerId, userId));
  // Anonymise delivery details on the user's past orders.
  await db.update(orders).set({ addressLine1: 'Removed', addressLine2: null, postalCode: null, contactPhone: null }).where(eq(orders.buyerId, userId));
  await db
    .update(users)
    .set({
      email: `deleted-${user.id}@deleted.invalid`,
      fullName: 'Deleted user',
      phone: null,
      addressLine1: null, addressLine2: null, city: null, district: null, postalCode: null,
      passwordHash: await bcrypt.hash(randomBytes(24).toString('hex'), 10),
      deletedAt: new Date(),
      tokenVersion: sql`${users.tokenVersion} + 1`,
      totpSecret: null, totpEnabledAt: null,
    })
    .where(eq(users.id, userId));
  forgetSession(userId);
  return { deleted: true };
}
