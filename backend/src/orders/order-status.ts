import { eq, sql } from 'drizzle-orm';
import { db } from '../db/client';
import { orderItems, orders, products } from '../db/schema';

type Status = 'PENDING' | 'PAID' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

// The order-level status is derived from its items, since each store in a
// multi-seller order ships independently.
export function deriveOrderStatus(itemStatuses: Status[]): Status {
  const live = itemStatuses.filter((s) => s !== 'CANCELLED');
  if (live.length === 0) return 'CANCELLED';
  if (live.every((s) => s === 'DELIVERED')) return 'DELIVERED';
  if (live.some((s) => s === 'SHIPPED' || s === 'DELIVERED')) return 'SHIPPED';
  return 'PENDING';
}

export async function refreshOrderStatus(orderId: string) {
  const items = await db
    .select({ s: orderItems.fulfillmentStatus })
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));
  const status = deriveOrderStatus(items.map((i) => i.s));
  await db.update(orders).set({ status }).where(eq(orders.id, orderId));
  return status;
}

export async function restock(productId: string, quantity: number) {
  await db
    .update(products)
    .set({ stock: sql`${products.stock} + ${quantity}` })
    .where(eq(products.id, productId));
}
