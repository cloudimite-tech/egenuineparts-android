import { NotFoundException, Injectable } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
import { db } from '../db/client';
import { cartItems, productImages } from '../db/schema';
import { presentPrice, usdToLkr } from '../products/pricing';
import { AddCartItemDto } from './dto/cart.dto';

@Injectable()
export class CartService {
  async list(userId: string) {
    const rows = await db.query.cartItems.findMany({
      where: eq(cartItems.userId, userId),
      with: {
        product: {
          with: {
            images: { orderBy: asc(productImages.position) },
            store: { columns: { id: true, name: true, slug: true, verified: true } },
          },
        },
      },
    });
    // Sale-aware prices: a flash sale that ends while it sits in the cart
    // simply shows the regular price next time the cart loads.
    const items = rows.map((i) => ({ ...i, product: presentPrice(i.product) }));

    const groups = new Map<string, { store: any; items: any[]; deliveryFee: number }>();
    for (const item of items) {
      const storeId = item.product.storeId;
      if (!groups.has(storeId)) {
        groups.set(storeId, { store: item.product.store, items: [], deliveryFee: 450 });
      }
      groups.get(storeId)!.items.push(item);
    }
    const sellerGroups = [...groups.values()];
    const subtotal = Math.round(items.reduce((sum, i) => sum + i.product.priceLkr * i.quantity, 0) * 100) / 100;
    const deliveryTotal = sellerGroups.reduce((s, g) => s + g.deliveryFee, 0);

    return {
      items,
      sellerGroups,
      subtotal,
      deliveryTotal,
      total: subtotal + deliveryTotal,
      currency: 'LKR',
      usdToLkr: usdToLkr(),
    };
  }

  async add(userId: string, dto: AddCartItemDto) {
    const existing = await db.query.cartItems.findFirst({
      where: and(eq(cartItems.userId, userId), eq(cartItems.productId, dto.productId)),
    });
    if (existing) {
      await db
        .update(cartItems)
        .set({ quantity: existing.quantity + dto.quantity })
        .where(eq(cartItems.id, existing.id));
    } else {
      await db.insert(cartItems).values({ userId, productId: dto.productId, quantity: dto.quantity });
    }
    return this.list(userId);
  }

  async updateQuantity(userId: string, itemId: string, quantity: number) {
    const existing = await db.query.cartItems.findFirst({
      where: and(eq(cartItems.id, itemId), eq(cartItems.userId, userId)),
    });
    if (!existing) throw new NotFoundException('Cart item not found.');
    if (quantity === 0) {
      await db.delete(cartItems).where(eq(cartItems.id, itemId));
    } else {
      await db.update(cartItems).set({ quantity }).where(eq(cartItems.id, itemId));
    }
    return this.list(userId);
  }

  async remove(userId: string, itemId: string) {
    await db.delete(cartItems).where(and(eq(cartItems.id, itemId), eq(cartItems.userId, userId)));
    return this.list(userId);
  }
}
