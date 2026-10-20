import { BadRequestException, Body, Controller, ForbiddenException, NotFoundException, Post, UseGuards } from '@nestjs/common';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { and, eq, or } from 'drizzle-orm';
import { db } from '../db/client';
import { appointments, conversations, messages, orderItems, orders, products, reports, reviews, services, stores, users } from '../db/schema';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { NoGuestGuard } from '../common/guards/no-guest.guard';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { hit } from '../security/rate-limit';

export const REPORT_REASONS = ['SCAM', 'FAKE_OR_COUNTERFEIT', 'CONTACT_OUTSIDE_APP', 'ABUSIVE', 'INAPPROPRIATE', 'WRONG_INFO', 'SPAM', 'NO_SHOW', 'PAYMENT_ISSUE', 'OTHER'] as const;

class ReportDto {
  @IsIn(['PRODUCT', 'STORE', 'MESSAGE', 'REVIEW', 'CONVERSATION', 'SERVICE', 'USER']) targetType: 'PRODUCT' | 'STORE' | 'MESSAGE' | 'REVIEW' | 'CONVERSATION' | 'SERVICE' | 'USER';
  @IsString() targetId: string;
  @IsIn(REPORT_REASONS as unknown as string[]) reason: string;
  @IsOptional() @IsString() @MaxLength(1000) details?: string;
  // What the report is about, shown to admins (e.g. "Order AG-1A2B3C").
  @IsOptional() @IsString() @MaxLength(120) context?: string;
}

// Google Play UGC rule: users can report listings, stores, messages and reviews -
// and sellers/buyers they've dealt with (orders, appointments, chats).
@Controller('reports')
@UseGuards(JwtAuthGuard, NoGuestGuard)
export class ReportsController {
  @Post()
  async create(@CurrentUser() user: JwtUser, @Body() dto: ReportDto) {
    await hit(`report:${user.sub}`, 30, 86400, 'You’ve sent a lot of reports today. Our team is reviewing them.');
    const targetUserId = await this.ownerOf(user.sub, dto.targetType, dto.targetId);
    if (targetUserId === user.sub) throw new BadRequestException('You can’t report yourself.');
    const existing = await db.query.reports.findFirst({
      where: and(eq(reports.reporterId, user.sub), eq(reports.targetType, dto.targetType), eq(reports.targetId, dto.targetId), eq(reports.status, 'OPEN')),
    });
    if (existing) return { reported: true, id: existing.id };
    const details = [dto.context?.trim() ? `[${dto.context.trim()}]` : '', dto.details?.trim() ?? ''].filter(Boolean).join(' ') || null;
    const [r] = await db
      .insert(reports)
      .values({ reporterId: user.sub, targetType: dto.targetType, targetId: dto.targetId, targetUserId, reason: dto.reason, details })
      .returning({ id: reports.id });
    return { reported: true, id: r.id };
  }

  // Who is responsible for the reported content (and is the reporter allowed to see it?).
  private async ownerOf(reporterId: string, type: ReportDto['targetType'], id: string): Promise<string | null> {
    if (type === 'USER') {
      const u = await db.query.users.findFirst({ where: eq(users.id, id), columns: { id: true } });
      if (!u) throw new NotFoundException('User not found.');
      if (u.id !== reporterId && !(await this.haveDealt(reporterId, u.id))) throw new ForbiddenException('You can only report people you’ve dealt with in the app.');
      return u.id;
    }
    if (type === 'PRODUCT') {
      const p = await db.query.products.findFirst({ where: eq(products.id, id), with: { store: { columns: { ownerId: true } } } });
      if (!p) throw new NotFoundException('Listing not found.');
      return p.store.ownerId;
    }
    if (type === 'SERVICE') {
      const sv = await db.query.services.findFirst({ where: eq(services.id, id), with: { store: { columns: { ownerId: true } } } });
      if (!sv) throw new NotFoundException('Service not found.');
      return sv.store.ownerId;
    }
    if (type === 'STORE') {
      const s = await db.query.stores.findFirst({ where: eq(stores.id, id), columns: { ownerId: true } });
      if (!s) throw new NotFoundException('Store not found.');
      return s.ownerId;
    }
    if (type === 'REVIEW') {
      const r = await db.query.reviews.findFirst({ where: eq(reviews.id, id), columns: { userId: true } });
      if (!r) throw new NotFoundException('Review not found.');
      return r.userId;
    }
    const convId = type === 'MESSAGE' ? (await db.query.messages.findFirst({ where: eq(messages.id, id), columns: { conversationId: true } }))?.conversationId : id;
    if (!convId) throw new NotFoundException('Message not found.');
    const c = await db.query.conversations.findFirst({ where: eq(conversations.id, convId), with: { store: { columns: { ownerId: true } } } });
    if (!c) throw new NotFoundException('Conversation not found.');
    if (c.buyerId !== reporterId && c.store.ownerId !== reporterId) throw new ForbiddenException('Not part of this conversation.');
    if (type === 'MESSAGE') {
      const m = await db.query.messages.findFirst({ where: eq(messages.id, id), columns: { senderId: true } });
      return m!.senderId;
    }
    return c.buyerId === reporterId ? c.store.ownerId : c.buyerId;
  }

  // True if the two users have an order, appointment or chat between them
  // (either one as the buyer and the other as the store owner).
  private async haveDealt(a: string, b: string): Promise<boolean> {
    const owned = await db.select({ id: stores.id, ownerId: stores.ownerId }).from(stores).where(or(eq(stores.ownerId, a), eq(stores.ownerId, b)));
    const storeOf = (u: string) => owned.find((s) => s.ownerId === u)?.id;
    const pairs = [[a, storeOf(b)], [b, storeOf(a)]].filter((p): p is [string, string] => !!p[1]);
    for (const [buyer, store] of pairs) {
      const chat = await db.query.conversations.findFirst({ where: and(eq(conversations.buyerId, buyer), eq(conversations.storeId, store)), columns: { id: true } });
      if (chat) return true;
      const appt = await db.query.appointments.findFirst({ where: and(eq(appointments.buyerId, buyer), eq(appointments.storeId, store)), columns: { id: true } });
      if (appt) return true;
      const [order] = await db
        .select({ id: orders.id })
        .from(orders)
        .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
        .where(and(eq(orders.buyerId, buyer), eq(orderItems.storeId, store)))
        .limit(1);
      if (order) return true;
    }
    return false;
  }
}
