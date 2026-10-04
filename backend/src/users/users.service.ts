import { Injectable, NotFoundException } from '@nestjs/common';
import { count, eq } from 'drizzle-orm';
import { db } from '../db/client';
import { orders, reviews, stores, users, wishlistItems } from '../db/schema';

@Injectable()
export class UsersService {
  async me(userId: string) {
    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!user) throw new NotFoundException('User not found.');
    const store = await db.query.stores.findFirst({
      where: eq(stores.ownerId, userId),
      columns: { id: true, name: true, slug: true, verified: true },
    });
    const [[o], [w], [r]] = await Promise.all([
      db.select({ n: count() }).from(orders).where(eq(orders.buyerId, userId)),
      db.select({ n: count() }).from(wishlistItems).where(eq(wishlistItems.userId, userId)),
      db.select({ n: count() }).from(reviews).where(eq(reviews.userId, userId)),
    ]);
    const { passwordHash, ...safeUser } = user;
    return {
      ...safeUser,
      store: store ?? null,
      counts: { orders: Number(o.n), wishlist: Number(w.n), reviews: Number(r.n) },
    };
  }
}
