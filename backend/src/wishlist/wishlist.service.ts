import { Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, desc, eq } from 'drizzle-orm';
import { db } from '../db/client';
import { productImages, products, wishlistItems } from '../db/schema';
import { presentPrice } from '../products/pricing';

@Injectable()
export class WishlistService {
  async list(userId: string) {
    const rows = await db.query.wishlistItems.findMany({
      where: eq(wishlistItems.userId, userId),
      with: {
        product: {
          with: {
            images: { orderBy: asc(productImages.position) },
            store: { columns: { id: true, name: true, slug: true, verified: true, status: true } },
          },
        },
      },
      orderBy: desc(wishlistItems.createdAt),
    });
    return rows
      .filter((r) => r.product.isActive && r.product.store.status === 'APPROVED')
      .map((r) => {
        const { status, ...store } = r.product.store;
        return presentPrice({ ...r.product, store });
      });
  }

  async ids(userId: string) {
    const rows = await db
      .select({ productId: wishlistItems.productId })
      .from(wishlistItems)
      .where(eq(wishlistItems.userId, userId));
    return rows.map((r) => r.productId);
  }

  async add(userId: string, productId: string) {
    const product = await db.query.products.findFirst({ where: eq(products.id, productId) });
    if (!product) throw new NotFoundException('Product not found.');
    await db.insert(wishlistItems).values({ userId, productId }).onConflictDoNothing();
    return this.ids(userId);
  }

  async remove(userId: string, productId: string) {
    await db
      .delete(wishlistItems)
      .where(and(eq(wishlistItems.userId, userId), eq(wishlistItems.productId, productId)));
    return this.ids(userId);
  }
}
