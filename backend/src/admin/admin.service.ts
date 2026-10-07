import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { and, count, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../db/client';
import { orders, products, sellerDocuments, stores, users } from '../db/schema';

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

  async stats() {
    const byStatus = await db.select({ status: stores.status, n: count() }).from(stores).groupBy(stores.status);
    const byRole = await db.select({ role: users.role, n: count() }).from(users).groupBy(users.role);
    const [[p], [o]] = await Promise.all([
      db.select({ n: count() }).from(products).where(eq(products.isActive, true)),
      db.select({ n: count() }).from(orders),
    ]);
    const s = Object.fromEntries(byStatus.map((r) => [r.status, Number(r.n)]));
    const r = Object.fromEntries(byRole.map((x) => [x.role, Number(x.n)]));
    return {
      sellers: { PENDING: s.PENDING ?? 0, APPROVED: s.APPROVED ?? 0, REJECTED: s.REJECTED ?? 0, SUSPENDED: s.SUSPENDED ?? 0 },
      users: { buyers: r.BUYER ?? 0, sellers: r.SELLER ?? 0, admins: r.ADMIN ?? 0 },
      products: Number(p.n),
      orders: Number(o.n),
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
    if (action === 'approve') {
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
}
