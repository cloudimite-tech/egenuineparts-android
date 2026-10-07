import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { and, count, eq, ne } from 'drizzle-orm';
import { db } from '../db/client';
import { orders, reviews, stores, users, wishlistItems } from '../db/schema';
import { sellerStatusFor } from '../common/seller-access';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  async me(userId: string) {
    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!user) throw new NotFoundException('User not found.');
    const store = await db.query.stores.findFirst({
      where: eq(stores.ownerId, userId),
      columns: { id: true, name: true, slug: true, verified: true, status: true, reviewNote: true },
    });
    const [[o], [w], [r]] = await Promise.all([
      db.select({ n: count() }).from(orders).where(eq(orders.buyerId, userId)),
      db.select({ n: count() }).from(wishlistItems).where(eq(wishlistItems.userId, userId)),
      db.select({ n: count() }).from(reviews).where(eq(reviews.userId, userId)),
    ]);
    const { passwordHash, ...safeUser } = user;
    return {
      ...safeUser,
      sellerStatus: await sellerStatusFor(userId, user.role),
      store: store ?? null,
      counts: { orders: Number(o.n), wishlist: Number(w.n), reviews: Number(r.n) },
    };
  }

  async update(userId: string, dto: UpdateProfileDto) {
    if (dto.phone) {
      const taken = await db.query.users.findFirst({ where: and(eq(users.phone, dto.phone), ne(users.id, userId)) });
      if (taken) throw new ConflictException('This mobile number is already used by another account.');
    }
    const patch: Partial<typeof users.$inferInsert> = {};
    if (dto.fullName !== undefined) patch.fullName = dto.fullName.trim();
    if (dto.phone !== undefined) patch.phone = dto.phone;
    if (dto.addressLine1 !== undefined) patch.addressLine1 = dto.addressLine1.trim();
    if (dto.addressLine2 !== undefined) patch.addressLine2 = dto.addressLine2.trim() || null;
    if (dto.city !== undefined) patch.city = dto.city.trim();
    if (dto.district !== undefined) patch.district = dto.district;
    if (Object.keys(patch).length) await db.update(users).set(patch).where(eq(users.id, userId));
    return this.me(userId);
  }
}
