import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, count, desc, eq, inArray, lte, sql } from 'drizzle-orm';
import { db } from '../db/client';
import { orderItems, orders, productImages, products, stores, users } from '../db/schema';
import { refreshOrderStatus, restock } from '../orders/order-status';

const ALLOWED_NEXT: Record<string, string[]> = {
  PENDING: ['SHIPPED', 'CANCELLED'],
  PAID: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

@Injectable()
export class SellerService {
  private async store(userId: string) {
    const store = await db.query.stores.findFirst({ where: eq(stores.ownerId, userId) });
    if (!store) throw new ForbiddenException('You don’t have a store yet.');
    return store;
  }

  async dashboard(userId: string) {
    const store = await this.store(userId);

    const [[productCount], [lowStock], [pending], [revenue]] = await Promise.all([
      db.select({ n: count() }).from(products).where(and(eq(products.storeId, store.id), eq(products.isActive, true))),
      db
        .select({ n: count() })
        .from(products)
        .where(and(eq(products.storeId, store.id), eq(products.isActive, true), lte(products.stock, 3))),
      db
        .select({ n: sql<number>`count(distinct ${orderItems.orderId})` })
        .from(orderItems)
        .where(and(eq(orderItems.storeId, store.id), inArray(orderItems.fulfillmentStatus, ['PENDING', 'PAID']))),
      db
        .select({
          total: sql<string>`coalesce(sum(coalesce(${orderItems.unitPriceLkr}, ${orderItems.unitPrice}) * ${orderItems.quantity}), 0)`,
          units: sql<number>`coalesce(sum(${orderItems.quantity}), 0)`,
        })
        .from(orderItems)
        .where(and(eq(orderItems.storeId, store.id), sql`${orderItems.fulfillmentStatus} <> 'CANCELLED'`)),
    ]);

    return {
      store,
      stats: {
        activeProducts: Number(productCount.n),
        lowStock: Number(lowStock.n),
        pendingOrders: Number(pending.n),
        revenue: Number(revenue.total),
        unitsSold: Number(revenue.units),
      },
    };
  }

  async orders(userId: string) {
    const store = await this.store(userId);
    const myItems = await db.query.orderItems.findMany({
      where: eq(orderItems.storeId, store.id),
      with: {
        product: { with: { images: { orderBy: asc(productImages.position) } } },
        order: { with: { buyer: { columns: { id: true, fullName: true } } } },
      },
    });

    // Group this store's items by order — a seller only ever sees their own
    // lines of a multi-seller order.
    const byOrder = new Map<string, any>();
    for (const item of myItems) {
      const o = item.order;
      if (!byOrder.has(o.id)) {
        byOrder.set(o.id, {
          id: o.id,
          createdAt: o.createdAt,
          buyerName: o.buyer.fullName,
          shipping: {
            addressLine1: o.addressLine1,
            addressLine2: o.addressLine2,
            city: o.city,
            district: o.district,
            contactPhone: o.contactPhone,
          },
          paymentMethod: o.paymentMethod,
          status: item.fulfillmentStatus,
          items: [],
          subtotal: 0,
        });
      }
      const entry = byOrder.get(o.id);
      entry.items.push({
        id: item.id,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        currency: item.currency,
        unitPriceLkr: item.unitPriceLkr ?? item.unitPrice,
        fulfillmentStatus: item.fulfillmentStatus,
        product: item.product,
      });
      entry.subtotal += Number(item.unitPriceLkr ?? item.unitPrice) * item.quantity;
    }
    return [...byOrder.values()].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  async updateStatus(userId: string, orderId: string, status: string) {
    const store = await this.store(userId);
    const items = await db
      .select()
      .from(orderItems)
      .where(and(eq(orderItems.orderId, orderId), eq(orderItems.storeId, store.id)));
    if (items.length === 0) throw new NotFoundException('Order not found.');

    const current = items[0].fulfillmentStatus;
    if (!ALLOWED_NEXT[current]?.includes(status)) {
      throw new BadRequestException(`Can’t move an order from ${current} to ${status}.`);
    }
    if (status === 'CANCELLED') {
      for (const i of items) await restock(i.productId, i.quantity);
    }
    await db
      .update(orderItems)
      .set({ fulfillmentStatus: status as any })
      .where(and(eq(orderItems.orderId, orderId), eq(orderItems.storeId, store.id)));
    await refreshOrderStatus(orderId);
    return { success: true, status };
  }
}
