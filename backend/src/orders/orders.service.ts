import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../db/client';
import { cartItems, orderItems, orders, productImages, products, stores } from '../db/schema';
import { CreateOrderDto } from './dto/order.dto';
import { refreshOrderStatus, restock } from './order-status';
import { effectivePrice, rateFor, toLkr } from '../products/pricing';

export const DELIVERY_FEE_PER_SELLER = 450;

const itemWith = {
  product: { with: { images: { orderBy: asc(productImages.position) } } },
  store: { columns: { id: true, name: true, slug: true } },
} as const;

@Injectable()
export class OrdersService {
  async checkout(userId: string, dto: CreateOrderDto) {
    const allItems = await db.query.cartItems.findMany({
      where: eq(cartItems.userId, userId),
      with: { product: true },
    });
    const items = dto.cartItemIds?.length
      ? allItems.filter((i) => dto.cartItemIds!.includes(i.id))
      : allItems;
    if (items.length === 0) throw new BadRequestException('Your cart is empty.');

    for (const i of items) {
      if (!i.product.isActive) {
        throw new BadRequestException(`“${i.product.title}” is no longer available. Remove it from your cart.`);
      }
      if (i.product.stock < i.quantity) {
        throw new BadRequestException(
          i.product.stock === 0
            ? `“${i.product.title}” is out of stock.`
            : `Only ${i.product.stock} left of “${i.product.title}”.`,
        );
      }
    }

    const storeIds = new Set(items.map((i) => i.product.storeId));
    const activeStores = await db.query.stores.findMany({
      where: inArray(stores.id, [...storeIds]),
      columns: { id: true, status: true },
    });
    for (const i of items) {
      if (activeStores.find((s) => s.id === i.product.storeId)?.status !== 'APPROVED') {
        throw new BadRequestException(`“${i.product.title}” is no longer available. Remove it from your cart.`);
      }
    }
    const subtotal =
      Math.round(items.reduce((s, i) => s + toLkr(effectivePrice(i.product), i.product.currency) * i.quantity, 0) * 100) / 100;
    const deliveryFee = storeIds.size * DELIVERY_FEE_PER_SELLER;

    const orderId = await db.transaction(async (tx) => {
      const [order] = await tx
        .insert(orders)
        .values({
          buyerId: userId,
          subtotal: String(subtotal),
          deliveryFee: String(deliveryFee),
          total: String(subtotal + deliveryFee),
          addressLine1: dto.addressLine1.trim(),
          addressLine2: dto.addressLine2?.trim() || null,
          city: dto.city.trim(),
          district: dto.district?.trim() || null,
          contactPhone: dto.contactPhone.trim(),
          paymentMethod: dto.paymentMethod ?? 'COD',
        })
        .returning();

      await tx.insert(orderItems).values(
        items.map((i) => ({
          orderId: order.id,
          productId: i.productId,
          storeId: i.product.storeId,
          quantity: i.quantity,
          unitPrice: effectivePrice(i.product),
          currency: i.product.currency,
          exchangeRate: String(rateFor(i.product.currency)),
          unitPriceLkr: String(toLkr(effectivePrice(i.product), i.product.currency)),
        })),
      );
      for (const i of items) {
        await tx
          .update(products)
          .set({ stock: sql`${products.stock} - ${i.quantity}` })
          .where(eq(products.id, i.productId));
      }
      await tx.delete(cartItems).where(
        and(eq(cartItems.userId, userId), inArray(cartItems.id, items.map((i) => i.id))),
      );
      return order.id;
    });

    return this.get(userId, orderId);
  }

  list(userId: string) {
    return db.query.orders.findMany({
      where: eq(orders.buyerId, userId),
      with: { items: { with: itemWith } },
      orderBy: desc(orders.createdAt),
    });
  }

  async get(userId: string, orderId: string) {
    const order = await db.query.orders.findFirst({
      where: and(eq(orders.id, orderId), eq(orders.buyerId, userId)),
      with: { items: { with: itemWith } },
    });
    if (!order) throw new NotFoundException('Order not found.');
    return order;
  }

  // Buyers can cancel while nothing in the order has shipped yet.
  async cancel(userId: string, orderId: string) {
    const order = await this.get(userId, orderId);
    if (order.items.some((i) => i.fulfillmentStatus === 'SHIPPED' || i.fulfillmentStatus === 'DELIVERED')) {
      throw new BadRequestException('Part of this order has already shipped, so it can’t be cancelled.');
    }
    for (const item of order.items) {
      if (item.fulfillmentStatus !== 'CANCELLED') {
        await restock(item.productId, item.quantity);
      }
    }
    await db
      .update(orderItems)
      .set({ fulfillmentStatus: 'CANCELLED' })
      .where(eq(orderItems.orderId, orderId));
    await refreshOrderStatus(orderId);
    return this.get(userId, orderId);
  }
}
