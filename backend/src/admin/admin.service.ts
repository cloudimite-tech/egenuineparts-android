import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { and, count, desc, eq, ilike, inArray, isNull, lt, or, sql } from 'drizzle-orm';
import { db } from '../db/client';
import { adminAudit, conversations, emailCodes, messages, orders, products, rateLimits, reports, reviews, sellerDocuments, services, serviceTypeRequests, stores, users } from '../db/schema';
import { audit } from './audit';
import { forgetSession } from '../security/session-check';

type Status = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
const DOC_LINK_TTL = '10m';

// Straight-line distance in metres between two coordinates.
function distanceM(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

@Injectable()
export class AdminService {
  constructor(private readonly jwt: JwtService) {}

  // ---- data retention: verification files aren't kept forever ----
  private lastCleanup = 0;
  async cleanup() {
    if (Date.now() - this.lastCleanup < 60 * 60 * 1000) return;
    this.lastCleanup = Date.now();
    const days = (n: number) => new Date(Date.now() - n * 86400000);
    const keepApproved = Number(process.env.KYC_RETENTION_DAYS || 90);
    // NIC photos + selfie of approved stores: deleted after KYC_RETENTION_DAYS (BR certificate kept).
    const approvedOld = await db.select().from(stores).where(and(eq(stores.status, 'APPROVED'), lt(stores.reviewedAt, days(keepApproved))));
    for (const st of approvedOld) {
      const ids = [st.nicFrontDocumentId, st.nicBackDocumentId, st.selfieDocumentId].filter(Boolean) as string[];
      if (!ids.length) continue;
      await db.delete(sellerDocuments).where(inArray(sellerDocuments.id, ids));
      await db.update(stores).set({ nicFrontDocumentId: null, nicBackDocumentId: null, selfieDocumentId: null }).where(eq(stores.id, st.id));
    }
    // Rejected applications not resubmitted within 30 days: all files deleted.
    const rejectedOld = await db.select().from(stores).where(and(eq(stores.status, 'REJECTED'), lt(stores.reviewedAt, days(30))));
    for (const st of rejectedOld) {
      await db.delete(sellerDocuments).where(eq(sellerDocuments.ownerId, st.ownerId));
      await db.update(stores).set({ nicFrontDocumentId: null, nicBackDocumentId: null, selfieDocumentId: null, brDocumentId: null }).where(eq(stores.id, st.id));
    }
    await db.delete(emailCodes).where(lt(emailCodes.createdAt, days(2)));
    await db.delete(rateLimits).where(lt(rateLimits.windowStart, days(2)));
    await db.delete(adminAudit).where(lt(adminAudit.createdAt, days(365)));
  }

  async stats() {
    await this.cleanup().catch(() => {});
    const [[openReports]] = await Promise.all([db.select({ n: count() }).from(reports).where(eq(reports.status, 'OPEN'))]);
    const byStatus = await db.select({ status: stores.status, n: count() }).from(stores).groupBy(stores.status);
    const byRole = await db.select({ role: users.role, n: count() }).from(users).groupBy(users.role);
    const [[p], [o], [sv], [sr]] = await Promise.all([
      db.select({ n: count() }).from(products).where(eq(products.isActive, true)),
      db.select({ n: count() }).from(orders),
      db.select({ n: count() }).from(services).where(eq(services.isActive, true)),
      db.select({ n: count() }).from(serviceTypeRequests).where(eq(serviceTypeRequests.status, 'PENDING')),
    ]);
    const s = Object.fromEntries(byStatus.map((r) => [r.status, Number(r.n)]));
    const r = Object.fromEntries(byRole.map((x) => [x.role, Number(x.n)]));
    return {
      sellers: { PENDING: s.PENDING ?? 0, APPROVED: s.APPROVED ?? 0, REJECTED: s.REJECTED ?? 0, SUSPENDED: s.SUSPENDED ?? 0 },
      users: { buyers: r.BUYER ?? 0, sellers: r.SELLER ?? 0, admins: r.ADMIN ?? 0 },
      products: Number(p.n),
      orders: Number(o.n),
      openReports: Number(openReports.n),
      services: Number(sv.n),
      serviceRequests: Number(sr.n),
    };
  }

  async listSellers(status?: Status) {
    const rows = await db
      .select({
        id: stores.id,
        storeName: stores.name,
        businessName: stores.businessName,
        brNumber: stores.brNumber,
        city: stores.city,
        district: stores.district,
        status: stores.status,
        submittedAt: stores.submittedAt,
        reviewedAt: stores.reviewedAt,
        ownerName: users.fullName,
        ownerEmail: users.email,
      })
      .from(stores)
      .innerJoin(users, eq(stores.ownerId, users.id))
      .where(status ? eq(stores.status, status) : undefined)
      // Oldest pending first so nobody waits forever; others newest first.
      .orderBy(status === 'PENDING' ? sql`${stores.submittedAt} asc nulls last` : desc(sql`coalesce(${stores.reviewedAt}, ${stores.submittedAt}, ${stores.createdAt})`));
    return rows;
  }

  async getSeller(storeId: string, adminId: string) {
    const store = await db.query.stores.findFirst({ where: eq(stores.id, storeId) });
    if (!store) throw new NotFoundException('Application not found.');
    await audit(adminId, 'view_application', 'store', storeId);
    const owner = await db.query.users.findFirst({ where: eq(users.id, store.ownerId) });
    const docIds = [store.brDocumentId, store.nicFrontDocumentId, store.nicBackDocumentId, store.selfieDocumentId].filter(Boolean) as string[];
    const docs = docIds.length
      ? await db.query.sellerDocuments.findMany({
          where: inArray(sellerDocuments.id, docIds),
          columns: { id: true, kind: true, fileName: true, mimeType: true, size: true, createdAt: true, capturedLat: true, capturedLng: true },
        })
      : [];
    // Short-lived, single-document links — work in <Image> and the browser
    // without exposing the admin's login token.
    const withLink = (id?: string | null) => {
      const d = docs.find((x) => x.id === id);
      if (!d) return null;
      const { capturedLat, capturedLng, ...rest } = d;
      return { ...rest, url: `/admin/documents/${d.id}?t=${this.jwt.sign({ sub: adminId, doc: d.id, typ: 'br-doc' }, { expiresIn: DOC_LINK_TTL })}` };
    };
    const selfieRow = docs.find((x) => x.id === store.selfieDocumentId);
    const reviewer = store.reviewedById
      ? await db.query.users.findFirst({ where: eq(users.id, store.reviewedById), columns: { fullName: true } })
      : null;
    const [pc] = await db.select({ n: count() }).from(products).where(and(eq(products.storeId, store.id), eq(products.isActive, true)));

    return {
      id: store.id,
      status: store.status,
      storeName: store.name,
      slug: store.slug,
      bio: store.bio,
      returnsPolicy: store.returnsPolicy,
      businessName: store.businessName,
      brNumber: store.brNumber,
      addressLine1: store.addressLine1,
      addressLine2: store.addressLine2,
      city: store.city,
      district: store.district,
      contactPhone: store.contactPhone,
      nicNumber: store.nicNumber,
      latitude: store.latitude,
      longitude: store.longitude,
      submittedAt: store.submittedAt,
      reviewedAt: store.reviewedAt,
      reviewedBy: reviewer?.fullName ?? null,
      reviewNote: store.reviewNote,
      productCount: Number(pc.n),
      owner: owner && {
        id: owner.id,
        fullName: owner.fullName,
        email: owner.email,
        phone: owner.phone,
        addressLine1: owner.addressLine1,
        addressLine2: owner.addressLine2,
        city: owner.city,
        district: owner.district,
        createdAt: owner.createdAt,
      },
      document: withLink(store.brDocumentId),
      nicFront: withLink(store.nicFrontDocumentId),
      nicBack: withLink(store.nicBackDocumentId),
      selfie: withLink(store.selfieDocumentId) && {
        ...withLink(store.selfieDocumentId)!,
        takenAt: selfieRow?.createdAt ?? null,
        latitude: selfieRow?.capturedLat ?? null,
        longitude: selfieRow?.capturedLng ?? null,
        // How far from the pinned shop the selfie was taken (null if the phone didn't share its location).
        distanceFromShopM:
          selfieRow?.capturedLat != null && selfieRow?.capturedLng != null && store.latitude != null && store.longitude != null
            ? distanceM(store.latitude, store.longitude, selfieRow.capturedLat, selfieRow.capturedLng)
            : null,
      },
    };
  }

  async review(storeId: string, adminId: string, action: 'approve' | 'reject', note?: string) {
    const store = await db.query.stores.findFirst({ where: eq(stores.id, storeId) });
    if (!store) throw new NotFoundException('Application not found.');
    if (action === 'reject' && !note?.trim()) throw new BadRequestException('Give the seller a reason.');
    // New / resubmitted applications need every document; reinstating a
    // suspended store doesn't (its NIC/selfie may have been deleted by the retention policy).
    if (action === 'approve' && (store.status === 'PENDING' || store.status === 'REJECTED')) {
      const missing = [
        !store.brDocumentId && 'BR certificate',
        !store.nicFrontDocumentId && 'NIC (front)',
        !store.nicBackDocumentId && 'NIC (back)',
        !store.selfieDocumentId && 'shop selfie',
        (store.latitude == null || store.longitude == null) && 'map location',
      ].filter(Boolean);
      if (missing.length) throw new BadRequestException(`This application is missing: ${missing.join(', ')}. Reject it and ask the seller to resubmit.`);
    }

    // Rejecting an approved store suspends it (its listings disappear).
    const status: Status = action === 'approve' ? 'APPROVED' : store.status === 'APPROVED' ? 'SUSPENDED' : 'REJECTED';
    await db
      .update(stores)
      .set({ status, verified: status === 'APPROVED', reviewedAt: new Date(), reviewedById: adminId, reviewNote: note?.trim() || null })
      .where(eq(stores.id, storeId));
    await audit(adminId, `store_${status.toLowerCase()}`, 'store', storeId, note);
    // A buyer who applied becomes a seller once approved.
    if (status === 'APPROVED') {
      await db.update(users).set({ role: 'SELLER' }).where(and(eq(users.id, store.ownerId), eq(users.role, 'BUYER')));
    }
    return this.getSeller(storeId, adminId);
  }

  async document(docId: string, token?: string) {
    let payload: any;
    try {
      payload = this.jwt.verify(token ?? '');
    } catch {
      throw new UnauthorizedException('This document link has expired. Reopen the application.');
    }
    if (payload?.typ !== 'br-doc' || payload?.doc !== docId) throw new UnauthorizedException('Invalid document link.');
    const admin = await db.query.users.findFirst({ where: eq(users.id, payload.sub), columns: { role: true } });
    if (admin?.role !== 'ADMIN') throw new UnauthorizedException('Invalid document link.');
    const doc = await db.query.sellerDocuments.findFirst({ where: eq(sellerDocuments.id, docId) });
    if (!doc) throw new NotFoundException('Document not found.');
    return doc;
  }

  // ---- reports (Google Play UGC moderation) ----
  async listReports(status: 'OPEN' | 'RESOLVED' | 'DISMISSED' = 'OPEN') {
    const rows = await db
      .select({
        id: reports.id, targetType: reports.targetType, targetId: reports.targetId, targetUserId: reports.targetUserId,
        reason: reports.reason, details: reports.details, status: reports.status, createdAt: reports.createdAt,
        resolutionNote: reports.resolutionNote, reporterName: users.fullName, reporterEmail: users.email,
      })
      .from(reports)
      .innerJoin(users, eq(reports.reporterId, users.id))
      .where(eq(reports.status, status))
      .orderBy(status === 'OPEN' ? reports.createdAt : desc(reports.resolvedAt))
      .limit(200);
    return Promise.all(rows.map(async (r) => ({ ...r, preview: await this.preview(r.targetType, r.targetId), targetUser: await this.userBrief(r.targetUserId) })));
  }

  private async userBrief(id?: string | null) {
    if (!id) return null;
    const u = await db.query.users.findFirst({ where: eq(users.id, id), columns: { id: true, fullName: true, email: true, role: true, bannedAt: true } });
    if (!u) return null;
    const [{ n }] = await db.select({ n: count() }).from(reports).where(eq(reports.targetUserId, id));
    return { ...u, banned: !!u.bannedAt, timesReported: Number(n) };
  }

  /** A short, human-readable look at the reported thing. */
  private async preview(type: string, id: string): Promise<{ title: string; body?: string | null; storeId?: string; active?: boolean } | null> {
    if (type === 'PRODUCT') {
      const p = await db.query.products.findFirst({ where: eq(products.id, id), with: { store: { columns: { id: true, name: true } } } });
      return p ? { title: `${p.title} — ${p.store.name}`, body: p.description, storeId: p.store.id, active: p.isActive } : null;
    }
    if (type === 'STORE') {
      const st = await db.query.stores.findFirst({ where: eq(stores.id, id) });
      return st ? { title: st.name, body: st.bio, storeId: st.id, active: st.status === 'APPROVED' } : null;
    }
    if (type === 'REVIEW') {
      const r = await db.query.reviews.findFirst({ where: eq(reviews.id, id), with: { product: { columns: { title: true } } } });
      return r ? { title: `${r.rating}★ review on ${r.product.title}`, body: r.comment, active: true } : null;
    }
    if (type === 'SERVICE') {
      const sv = await db.query.services.findFirst({ where: eq(services.id, id), with: { store: { columns: { id: true, name: true } } } });
      return sv ? { title: `${sv.title} — ${sv.store.name}`, body: sv.description, storeId: sv.store.id, active: sv.isActive } : null;
    }
    if (type === 'MESSAGE') {
      const m = await db.query.messages.findFirst({ where: eq(messages.id, id) });
      return m ? { title: 'Chat message', body: m.body, active: true } : null;
    }
    if (type === 'CONVERSATION') {
      const last = await db.query.messages.findMany({ where: eq(messages.conversationId, id), orderBy: desc(messages.createdAt), limit: 8 });
      const c = await db.query.conversations.findFirst({ where: eq(conversations.id, id), with: { product: { columns: { title: true } }, service: { columns: { title: true } } } });
      return c ? { title: `Conversation about ${c.product?.title ?? c.service?.title ?? 'a listing'}`, body: last.reverse().map((m) => `• ${m.body}`).join('\n'), active: true } : null;
    }
    return null;
  }

  async resolveReport(id: string, adminId: string, action: 'dismiss' | 'remove_content' | 'suspend_store' | 'ban_user', note?: string) {
    const r = await db.query.reports.findFirst({ where: eq(reports.id, id) });
    if (!r) throw new NotFoundException('Report not found.');
    if (action === 'remove_content') {
      if (r.targetType === 'PRODUCT') await db.update(products).set({ isActive: false }).where(eq(products.id, r.targetId));
      else if (r.targetType === 'SERVICE') await db.update(services).set({ isActive: false }).where(eq(services.id, r.targetId));
      else if (r.targetType === 'REVIEW') await db.delete(reviews).where(eq(reviews.id, r.targetId));
      else if (r.targetType === 'MESSAGE') await db.update(messages).set({ body: 'This message was removed by AutoGuide.', wasFiltered: true }).where(eq(messages.id, r.targetId));
      else throw new BadRequestException('Nothing to remove for this report — suspend the store or ban the user instead.');
    }
    if (action === 'suspend_store') {
      const ownerStore = r.targetUserId ? await db.query.stores.findFirst({ where: eq(stores.ownerId, r.targetUserId) }) : null;
      if (!ownerStore) throw new BadRequestException('The reported user has no store.');
      await this.review(ownerStore.id, adminId, 'reject', note?.trim() || 'Suspended after a user report.');
    }
    if (action === 'ban_user') {
      if (!r.targetUserId) throw new BadRequestException('No user to ban for this report.');
      await this.banUser(r.targetUserId, adminId, note?.trim() || 'Banned after a user report.');
    }
    const status = action === 'dismiss' ? 'DISMISSED' : 'RESOLVED';
    // Close every open report about the same thing at once.
    await db
      .update(reports)
      .set({ status, resolutionNote: note?.trim() || action, resolvedById: adminId, resolvedAt: new Date() })
      .where(and(eq(reports.targetType, r.targetType), eq(reports.targetId, r.targetId), eq(reports.status, 'OPEN')));
    await audit(adminId, `report_${action}`, r.targetType.toLowerCase(), r.targetId, note);
    return { ok: true, status };
  }

  // ---- users ----
  async listUsers(q?: string) {
    const term = q?.trim();
    const rows = await db
      .select({
        id: users.id, fullName: users.fullName, email: users.email, phone: users.phone, role: users.role, city: users.city,
        createdAt: users.createdAt, emailVerifiedAt: users.emailVerifiedAt, bannedAt: users.bannedAt, banReason: users.banReason,
        storeName: stores.name, storeStatus: stores.status,
      })
      .from(users)
      .leftJoin(stores, eq(stores.ownerId, users.id))
      .where(and(isNull(users.deletedAt), term ? or(ilike(users.email, `%${term}%`), ilike(users.fullName, `%${term}%`), ilike(users.phone, `%${term}%`), ilike(stores.name, `%${term}%`)) : undefined))
      .orderBy(desc(users.createdAt))
      .limit(100);
    return rows.map(({ emailVerifiedAt, bannedAt, ...u }) => ({ ...u, emailVerified: !!emailVerifiedAt, banned: !!bannedAt, bannedAt }));
  }

  async banUser(userId: string, adminId: string, reason: string) {
    const u = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!u) throw new NotFoundException('User not found.');
    if (u.role === 'ADMIN') throw new BadRequestException('Admins can’t be banned here.');
    await db.update(users).set({ bannedAt: new Date(), banReason: reason, tokenVersion: sql`${users.tokenVersion} + 1` }).where(eq(users.id, userId));
    forgetSession(userId);
    // A banned seller's listings disappear too.
    const st = await db.query.stores.findFirst({ where: eq(stores.ownerId, userId) });
    if (st && st.status === 'APPROVED') {
      await db.update(stores).set({ status: 'SUSPENDED', verified: false, reviewNote: reason, reviewedAt: new Date(), reviewedById: adminId }).where(eq(stores.id, st.id));
    }
    await audit(adminId, 'user_ban', 'user', userId, reason);
    return { banned: true };
  }

  async unbanUser(userId: string, adminId: string) {
    await db.update(users).set({ bannedAt: null, banReason: null }).where(eq(users.id, userId));
    forgetSession(userId);
    await audit(adminId, 'user_unban', 'user', userId);
    return { banned: false };
  }

  async auditLog() {
    return db
      .select({ id: adminAudit.id, action: adminAudit.action, targetType: adminAudit.targetType, targetId: adminAudit.targetId, note: adminAudit.note, createdAt: adminAudit.createdAt, admin: users.email })
      .from(adminAudit)
      .leftJoin(users, eq(adminAudit.adminId, users.id))
      .orderBy(desc(adminAudit.createdAt))
      .limit(200);
  }
}
