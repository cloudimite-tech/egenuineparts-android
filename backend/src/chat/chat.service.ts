import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, count, desc, eq, gt, inArray, ne, or, sql } from 'drizzle-orm';
import { db } from '../db/client';
import { conversations, messages, productImages, products, stores } from '../db/schema';
import { checkForContactInfo } from '../common/contact-filter';
import { shortName } from '../products/products.service';
import { effectivePrice } from '../products/pricing';

// Only ever expose a display name for the other party — never email/phone.
const threadWith = {
  product: {
    columns: { id: true, title: true, brand: true, price: true, currency: true, salePrice: true, saleEndsAt: true, partNumber: true, isActive: true },
    with: { images: { orderBy: asc(productImages.position), limit: 1 } },
  },
  buyer: { columns: { id: true, fullName: true } },
  store: { columns: { id: true, name: true, slug: true, verified: true, ownerId: true } },
} as const;

type Thread = Awaited<ReturnType<ChatService['loadThread']>>;

@Injectable()
export class ChatService {
  private loadThread(id: string) {
    return db.query.conversations.findFirst({ where: eq(conversations.id, id), with: threadWith });
  }

  private present(c: NonNullable<Thread>, viewerId: string) {
    const viewerIsSeller = c.store.ownerId === viewerId;
    const { ownerId, ...store } = c.store;
    return {
      ...c,
      product: { ...c.product, price: effectivePrice(c.product) },
      store,
      buyer: { id: c.buyer.id, fullName: shortName(c.buyer.fullName) },
      viewerIsSeller,
      otherPartyName: viewerIsSeller ? shortName(c.buyer.fullName) : c.store.name,
    };
  }

  async startOrGetConversation(buyerId: string, productId: string) {
    const product = await db.query.products.findFirst({
      where: eq(products.id, productId),
      with: { store: true },
    });
    if (!product) throw new NotFoundException('Product not found.');
    if (product.store.ownerId === buyerId) {
      throw new ForbiddenException('This is your own listing.');
    }
    const existing = await db.query.conversations.findFirst({
      where: and(
        eq(conversations.productId, productId),
        eq(conversations.buyerId, buyerId),
        eq(conversations.storeId, product.storeId),
      ),
    });
    const id =
      existing?.id ??
      (await db.insert(conversations).values({ productId, buyerId, storeId: product.storeId }).returning())[0].id;
    return this.get(buyerId, id);
  }

  async assertParticipant(userId: string, conversationId: string) {
    const conversation = await db.query.conversations.findFirst({
      where: eq(conversations.id, conversationId),
      with: { store: { columns: { ownerId: true } } },
    });
    if (!conversation) throw new NotFoundException('Conversation not found.');
    const isBuyer = conversation.buyerId === userId;
    const isSeller = conversation.store.ownerId === userId;
    if (!isBuyer && !isSeller) throw new ForbiddenException('Not part of this conversation.');
    return { ...conversation, isBuyer, isSeller, sellerId: conversation.store.ownerId };
  }

  async get(userId: string, conversationId: string) {
    await this.assertParticipant(userId, conversationId);
    const thread = await this.loadThread(conversationId);
    return this.present(thread!, userId);
  }

  private async myStoreId(userId: string) {
    const s = await db.query.stores.findFirst({ where: eq(stores.ownerId, userId), columns: { id: true } });
    return s?.id ?? null;
  }

  async listForUser(userId: string) {
    const storeId = await this.myStoreId(userId);
    const threads = await db.query.conversations.findMany({
      where: storeId
        ? or(eq(conversations.buyerId, userId), eq(conversations.storeId, storeId))
        : eq(conversations.buyerId, userId),
      with: threadWith,
    });

    const result = await Promise.all(
      threads.map(async (c) => {
        const viewerIsSeller = c.store.ownerId === userId;
        const lastRead = viewerIsSeller ? c.sellerLastReadAt : c.buyerLastReadAt;
        const [last, [unread]] = await Promise.all([
          db.query.messages.findFirst({
            where: eq(messages.conversationId, c.id),
            orderBy: desc(messages.createdAt),
          }),
          db
            .select({ n: count() })
            .from(messages)
            .where(
              and(
                eq(messages.conversationId, c.id),
                ne(messages.senderId, userId),
                lastRead ? gt(messages.createdAt, lastRead) : sql`true`,
              ),
            ),
        ]);
        return { ...this.present(c, userId), lastMessage: last ?? null, unreadCount: Number(unread.n) };
      }),
    );

    // Hide threads that never got a first message, except for the buyer who
    // opened them (so a seller's inbox isn't full of empty "someone looked" rows).
    return result
      .filter((c) => c.lastMessage || !c.viewerIsSeller)
      .sort(
        (a, b) =>
          new Date(b.lastMessage?.createdAt ?? b.createdAt).getTime() -
          new Date(a.lastMessage?.createdAt ?? a.createdAt).getTime(),
      );
  }

  async unreadTotal(userId: string) {
    const list = await this.listForUser(userId);
    return { unread: list.reduce((s, c) => s + c.unreadCount, 0) };
  }

  async markRead(userId: string, conversationId: string) {
    const p = await this.assertParticipant(userId, conversationId);
    await db
      .update(conversations)
      .set(p.isSeller ? { sellerLastReadAt: new Date() } : { buyerLastReadAt: new Date() })
      .where(eq(conversations.id, conversationId));
    return { success: true };
  }

  async listMessages(userId: string, conversationId: string) {
    await this.markRead(userId, conversationId);
    return db.query.messages.findMany({
      where: eq(messages.conversationId, conversationId),
      orderBy: asc(messages.createdAt),
      limit: 300,
    });
  }

  // Central choke point: every message, whether sent over REST or the
  // websocket gateway, goes through here so the contact-info rule can never
  // be bypassed by one transport.
  async postMessage(userId: string, conversationId: string, rawBody: string) {
    const participant = await this.assertParticipant(userId, conversationId);
    const body = (rawBody ?? '').trim().slice(0, 2000);
    if (!body) return { blocked: true as const, reason: 'Message is empty.' };

    const filterResult = checkForContactInfo(body);
    if (filterResult.blocked) {
      return { blocked: true as const, reason: filterResult.reason };
    }

    const [message] = await db
      .insert(messages)
      .values({ conversationId, senderId: userId, body })
      .returning();
    // Sending counts as reading everything up to now.
    await this.markRead(userId, conversationId);
    return {
      blocked: false as const,
      message,
      recipients: [participant.buyerId, participant.sellerId],
    };
  }
}
