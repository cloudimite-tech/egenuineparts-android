import { BadRequestException, ForbiddenException, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { and, eq, inArray, notInArray } from 'drizzle-orm';
import { db } from '../db/client';
import { sellerDocuments, stores, users } from '../db/schema';
import { inSriLanka, SellerApplicationDto, UploadDocumentDto } from './application.dto';
import { processBusinessDocument } from './document-processing';

type DocKind = 'BR' | 'NIC_FRONT' | 'NIC_BACK' | 'SELFIE';

const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 30;
const recent = new Map<string, number[]>();
function throttle(userId: string) {
  const now = Date.now();
  const hits = (recent.get(userId) ?? []).filter((t) => now - t < WINDOW_MS);
  if (hits.length >= MAX_PER_WINDOW) {
    throw new HttpException('Too many uploads — please try again later.', HttpStatus.TOO_MANY_REQUESTS);
  }
  hits.push(now);
  recent.set(userId, hits);
}

function slugify(name: string) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `store-${Date.now()}`;
}

const docColumns = { id: true, kind: true, fileName: true, mimeType: true, size: true } as const;

@Injectable()
export class SellerApplicationService {
  // Seller accounts apply right after sign-up; buyers can apply too and keep
  // shopping while they're reviewed (they become sellers on approval).
  private async requireApplicant(userId: string) {
    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!user || (user.role !== 'SELLER' && user.role !== 'BUYER')) {
      throw new ForbiddenException('This account can’t open a store.');
    }
    return user;
  }

  async mine(userId: string) {
    await this.requireApplicant(userId);
    const store = await db.query.stores.findFirst({ where: eq(stores.ownerId, userId) });
    if (!store) return { status: 'NOT_SUBMITTED' as const, application: null };
    const ids = [store.brDocumentId, store.nicFrontDocumentId, store.nicBackDocumentId, store.selfieDocumentId].filter(Boolean) as string[];
    const docs = ids.length ? await db.query.sellerDocuments.findMany({ where: inArray(sellerDocuments.id, ids), columns: docColumns }) : [];
    const byId = (id?: string | null) => docs.find((d) => d.id === id) ?? null;
    return {
      status: store.status,
      reviewNote: store.reviewNote,
      submittedAt: store.submittedAt,
      reviewedAt: store.reviewedAt,
      application: {
        storeName: store.name,
        bio: store.bio,
        returnsPolicy: store.returnsPolicy,
        nicNumber: store.nicNumber,
        businessName: store.businessName,
        brNumber: store.brNumber,
        addressLine1: store.addressLine1,
        addressLine2: store.addressLine2,
        city: store.city,
        district: store.district,
        contactPhone: store.contactPhone,
        latitude: store.latitude,
        longitude: store.longitude,
        document: byId(store.brDocumentId),
        nicFront: byId(store.nicFrontDocumentId),
        nicBack: byId(store.nicBackDocumentId),
        selfie: byId(store.selfieDocumentId),
      },
    };
  }

  async uploadDocument(userId: string, file: { buffer: Buffer; originalname?: string }, meta: UploadDocumentDto) {
    await this.requireApplicant(userId);
    throttle(userId);
    const kind: DocKind = meta.kind ?? 'BR';
    const clean = await processBusinessDocument(file?.buffer, file?.originalname, { allowPdf: kind !== 'SELFIE' });
    const [doc] = await db
      .insert(sellerDocuments)
      .values({
        ownerId: userId,
        kind,
        fileName: clean.fileName,
        mimeType: clean.mimeType,
        size: clean.data.length,
        data: clean.data,
        capturedLat: kind === 'SELFIE' ? meta.lat ?? null : null,
        capturedLng: kind === 'SELFIE' ? meta.lng ?? null : null,
      })
      .returning({ id: sellerDocuments.id, kind: sellerDocuments.kind, fileName: sellerDocuments.fileName, mimeType: sellerDocuments.mimeType, size: sellerDocuments.size });
    return doc;
  }

  private async ownDoc(userId: string, id: string, kind: DocKind, label: string) {
    const doc = await db.query.sellerDocuments.findFirst({
      where: and(eq(sellerDocuments.id, id), eq(sellerDocuments.ownerId, userId), eq(sellerDocuments.kind, kind)),
      columns: { id: true },
    });
    if (!doc) throw new BadRequestException(`Upload ${label}.`);
    return doc.id;
  }

  async submit(userId: string, dto: SellerApplicationDto) {
    await this.requireApplicant(userId);
    if (!inSriLanka(dto.latitude, dto.longitude)) {
      throw new BadRequestException('Pin your shop’s location in Sri Lanka on the map.');
    }
    const br = await this.ownDoc(userId, dto.documentId, 'BR', 'your business registration certificate');
    const nicFront = await this.ownDoc(userId, dto.nicFrontDocumentId, 'NIC_FRONT', 'the front of your NIC');
    const nicBack = await this.ownDoc(userId, dto.nicBackDocumentId, 'NIC_BACK', 'the back of your NIC');
    const selfie = await this.ownDoc(userId, dto.selfieDocumentId, 'SELFIE', 'a selfie at your shop');

    const existing = await db.query.stores.findFirst({ where: eq(stores.ownerId, userId) });
    if (existing?.status === 'APPROVED') {
      throw new BadRequestException('Your store is already approved. Contact support to change business details.');
    }
    if (existing?.status === 'SUSPENDED') {
      throw new ForbiddenException('Your store is suspended. Please contact support.');
    }

    const fields = {
      name: dto.storeName.trim(),
      bio: dto.bio?.trim() || null,
      returnsPolicy: dto.returnsPolicy?.trim() || null,
      shipsFrom: dto.city.trim(),
      nicNumber: dto.nicNumber.trim().toUpperCase(),
      nicFrontDocumentId: nicFront,
      nicBackDocumentId: nicBack,
      selfieDocumentId: selfie,
      businessName: dto.businessName.trim(),
      brNumber: dto.brNumber.trim().toUpperCase(),
      brDocumentId: br,
      addressLine1: dto.addressLine1.trim(),
      addressLine2: dto.addressLine2?.trim() || null,
      city: dto.city.trim(),
      district: dto.district,
      contactPhone: dto.contactPhone,
      latitude: dto.latitude,
      longitude: dto.longitude,
      // (Re)submitting always goes back into the admin's review queue.
      status: 'PENDING' as const,
      verified: false,
      submittedAt: new Date(),
      reviewedAt: null,
      reviewedById: null,
      reviewNote: null,
    };

    if (existing) {
      await db.update(stores).set(fields).where(eq(stores.id, existing.id));
    } else {
      let slug = slugify(fields.name);
      if (await db.query.stores.findFirst({ where: eq(stores.slug, slug) })) {
        slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
      }
      await db.insert(stores).values({ ...fields, ownerId: userId, slug });
    }
    // Drop superseded uploads so only the submitted files are kept.
    await db.delete(sellerDocuments).where(and(eq(sellerDocuments.ownerId, userId), notInArray(sellerDocuments.id, [br, nicFront, nicBack, selfie])));
    return this.mine(userId);
  }
}
