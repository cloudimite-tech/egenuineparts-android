import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, count, desc, eq, ilike, inArray, isNull, or, sql } from 'drizzle-orm';
import { db } from '../db/client';
import {
  appointments, conversations, messages, serviceImages, services, serviceTypeRequests, serviceTypes, stores, userBlocks, users,
} from '../db/schema';
import { fromApprovedStore, requireApprovedStore } from '../common/seller-access';
import { checkForContactInfo } from '../common/contact-filter';
import { hit } from '../security/rate-limit';
import { MailService } from '../mail/mail.service';
import { ChatGateway } from '../chat/chat.gateway';
import { shortName } from '../products/products.service';
import { audit } from '../admin/audit';
import { ensureDefaultServiceTypes, slugify } from './service-types';
import {
  AdminRequestApproveDto, AdminServiceTypeDto, AdminServiceTypeUpdateDto, AppointmentRequestDto, ServiceDto, ServiceQueryDto,
  ServiceTypeRequestDto,
} from './services.dto';

const TZ = 'Asia/Colombo';
export function when(d: Date) {
  return d.toLocaleString('en-GB', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
}

// Photos must be ones our upload endpoint produced (Vercel Blob or local /uploads).
function cleanImages(urls?: string[]) {
  if (!urls) return undefined;
  const ok = urls.filter((u) => /^\/uploads\/[A-Za-z0-9_-]+\.jpg$/.test(u) || /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\/products\/[A-Za-z0-9_-]+\.jpg$/.test(u));
  if (ok.length !== urls.length) throw new BadRequestException('Please upload photos from the app.');
  return ok;
}

function noContact(...texts: (string | null | undefined)[]) {
  for (const t of texts) {
    if (!t) continue;
    const r = checkForContactInfo(t);
    if (r.blocked) throw new BadRequestException('Please don’t include phone numbers, emails or links — keep contact inside AutoGuide chat.');
  }
}

const storeCols = { id: true, name: true, slug: true, verified: true, city: true, district: true, latitude: true, longitude: true, logoUrl: true } as const;
const listWith = {
  type: { columns: { id: true, name: true, slug: true, icon: true } },
  images: { orderBy: asc(serviceImages.position) },
  store: { columns: storeCols },
} as const;

const OPEN = ['REQUESTED', 'ACCEPTED'] as const;

const apptWith = {
  service: { columns: { id: true, title: true, priceFrom: true, priceTo: true, durationMinutes: true }, with: { type: { columns: { name: true, icon: true } }, images: { orderBy: asc(serviceImages.position), limit: 1 } } },
  store: { columns: { id: true, name: true, slug: true, ownerId: true, city: true, district: true, latitude: true, longitude: true, addressLine1: true, addressLine2: true } },
  buyer: { columns: { id: true, fullName: true } },
} as const;

@Injectable()
export class ServicesService {
  constructor(private readonly mail: MailService, private readonly gateway: ChatGateway) {}

  // ------------------------------------------------------------------
  // Service types (public)
  // ------------------------------------------------------------------
  async types() {
    await ensureDefaultServiceTypes();
    const live = db
      .select({ typeId: services.typeId, n: count().as('n') })
      .from(services)
      .where(and(eq(services.isActive, true), fromApprovedStore(services.storeId)))
      .groupBy(services.typeId)
      .as('live');
    return db
      .select({ id: serviceTypes.id, name: serviceTypes.name, slug: serviceTypes.slug, icon: serviceTypes.icon, description: serviceTypes.description, serviceCount: sql<number>`coalesce(${live.n}, 0)::int` })
      .from(serviceTypes)
      .leftJoin(live, eq(live.typeId, serviceTypes.id))
      .where(eq(serviceTypes.isActive, true))
      .orderBy(asc(serviceTypes.sortOrder), asc(serviceTypes.name));
  }

  // ------------------------------------------------------------------
  // Listings
  // ------------------------------------------------------------------
  private present(s: any) {
    return {
      ...s,
      priceFrom: s.priceFrom != null ? Number(s.priceFrom) : null,
      priceTo: s.priceTo != null ? Number(s.priceTo) : null,
      images: (s.images ?? []).map((i: any) => i.url),
    };
  }

  async list(q: ServiceQueryDto) {
    await ensureDefaultServiceTypes();
    const conds: any[] = [
      eq(services.isActive, true),
      fromApprovedStore(services.storeId),
      inArray(services.typeId, db.select({ id: serviceTypes.id }).from(serviceTypes).where(eq(serviceTypes.isActive, true))),
    ];
    if (q.type) conds.push(inArray(services.typeId, db.select({ id: serviceTypes.id }).from(serviceTypes).where(eq(serviceTypes.slug, q.type))));
    if (q.q?.trim()) {
      const term = `%${q.q.trim()}%`;
      conds.push(or(ilike(services.title, term), ilike(services.description, term), inArray(services.storeId, db.select({ id: stores.id }).from(stores).where(ilike(stores.name, term)))));
    }
    if (q.district) conds.push(inArray(services.storeId, db.select({ id: stores.id }).from(stores).where(eq(stores.district, q.district))));
    if (q.store) conds.push(inArray(services.storeId, db.select({ id: stores.id }).from(stores).where(eq(stores.slug, q.store))));
    const rows = await db.query.services.findMany({ where: and(...conds), with: listWith, orderBy: desc(services.updatedAt), limit: q.limit ?? 50 });
    return rows.map((r) => this.present(r));
  }

  async get(id: string, viewerId?: string) {
    const s = await db.query.services.findFirst({ where: eq(services.id, id), with: { ...listWith, store: { columns: { ...storeCols, ownerId: true, status: true } } } });
    if (!s) throw new NotFoundException('Service not found.');
    const isOwner = !!viewerId && s.store.ownerId === viewerId;
    if (!isOwner && (!s.isActive || s.store.status !== 'APPROVED')) throw new NotFoundException('This service is no longer available.');
    const { ownerId, status, ...store } = s.store;
    return { ...this.present({ ...s, store }), isOwner };
  }

  async mine(userId: string) {
    const store = await db.query.stores.findFirst({ where: eq(stores.ownerId, userId), columns: { id: true } });
    if (!store) return [];
    const rows = await db.query.services.findMany({ where: and(eq(services.storeId, store.id), eq(services.isActive, true)), with: listWith, orderBy: desc(services.updatedAt) });
    return rows.map((r) => this.present(r));
  }

  private async validate(dto: ServiceDto) {
    const type = await db.query.serviceTypes.findFirst({ where: eq(serviceTypes.id, dto.typeId) });
    if (!type || !type.isActive) throw new BadRequestException('Please choose a service type from the list.');
    if (dto.priceFrom != null && dto.priceTo != null && dto.priceTo < dto.priceFrom) throw new BadRequestException('“Price to” must be more than “price from”.');
    noContact(dto.title, dto.description);
    cleanImages(dto.images); // throws before anything is saved
  }

  private values(dto: ServiceDto) {
    return {
      typeId: dto.typeId,
      title: dto.title.trim(),
      description: dto.description?.trim() || null,
      priceFrom: dto.priceFrom != null ? String(dto.priceFrom) : null,
      priceTo: dto.priceTo != null && dto.priceFrom != null ? String(dto.priceTo) : null,
      durationMinutes: dto.durationMinutes ?? null,
      updatedAt: new Date(),
    };
  }

  private async replaceImages(serviceId: string, urls?: string[]) {
    const clean = cleanImages(urls);
    if (!clean) return;
    await db.delete(serviceImages).where(eq(serviceImages.serviceId, serviceId));
    if (clean.length) await db.insert(serviceImages).values(clean.map((url, position) => ({ serviceId, url, position })));
  }

  async create(userId: string, dto: ServiceDto) {
    const store = await requireApprovedStore(userId);
    await this.validate(dto);
    await hit(`svc-create:${store.id}`, 30, 86400, 'You’ve added a lot of services today. Please try again tomorrow.');
    const [s] = await db.insert(services).values({ ...this.values(dto), storeId: store.id }).returning();
    await this.replaceImages(s.id, dto.images);
    return this.get(s.id, userId);
  }

  private async own(userId: string, id: string) {
    const store = await requireApprovedStore(userId);
    const s = await db.query.services.findFirst({ where: eq(services.id, id) });
    if (!s || s.storeId !== store.id || !s.isActive) throw new NotFoundException('Service not found.');
    return s;
  }

  async update(userId: string, id: string, dto: ServiceDto) {
    await this.own(userId, id);
    await this.validate(dto);
    await db.update(services).set(this.values(dto)).where(eq(services.id, id));
    await this.replaceImages(id, dto.images);
    return this.get(id, userId);
  }

  async remove(userId: string, id: string) {
    await this.own(userId, id);
    await db.update(services).set({ isActive: false, updatedAt: new Date() }).where(eq(services.id, id));
    return { success: true };
  }

  // ------------------------------------------------------------------
  // "My service isn't listed" — sellers ask admins to add a type
  // ------------------------------------------------------------------
  async requestType(userId: string, dto: ServiceTypeRequestDto) {
    const store = await requireApprovedStore(userId);
    const name = dto.name.trim().replace(/\s+/g, ' ');
    noContact(name, dto.note);
    const slug = slugify(name);
    const existing = await db.query.serviceTypes.findFirst({ where: and(eq(serviceTypes.slug, slug), eq(serviceTypes.isActive, true)) });
    if (existing) throw new ConflictException(`“${existing.name}” is already in the list — choose it when adding your service.`);
    const mine = await db.query.serviceTypeRequests.findMany({ where: and(eq(serviceTypeRequests.storeId, store.id), eq(serviceTypeRequests.status, 'PENDING')) });
    const dup = mine.find((r) => slugify(r.name) === slug);
    if (dup) return this.presentRequest(dup);
    if (mine.length >= 5) throw new BadRequestException('You already have 5 requests waiting. We’ll get back to you soon.');
    await hit(`svc-req:${store.id}`, 10, 86400, 'You’ve sent a lot of requests today. Please try again tomorrow.');
    const [r] = await db.insert(serviceTypeRequests).values({ storeId: store.id, requestedById: userId, name, note: dto.note?.trim() || null }).returning();

    // Tell the admins.
    const admins = await db.query.users.findMany({ where: and(eq(users.role, 'ADMIN'), isNull(users.deletedAt)), columns: { email: true } });
    for (const a of admins) {
      await this.mail.sendInfo(
        a.email,
        'New service type requested',
        `${store.name} asked for a new service type: “${name}”.${r.note ? ` Their note: “${r.note}”.` : ''} Review it in the admin panel under Services → Requests.`,
      );
    }
    return this.presentRequest(r);
  }

  private presentRequest(r: any) {
    return { id: r.id, name: r.name, note: r.note, status: r.status, reviewNote: r.reviewNote, createdAt: r.createdAt, reviewedAt: r.reviewedAt, serviceTypeId: r.serviceTypeId };
  }

  async myRequests(userId: string) {
    const store = await db.query.stores.findFirst({ where: eq(stores.ownerId, userId), columns: { id: true } });
    if (!store) return [];
    const rows = await db.query.serviceTypeRequests.findMany({ where: eq(serviceTypeRequests.storeId, store.id), orderBy: desc(serviceTypeRequests.createdAt), limit: 50 });
    return rows.map((r) => this.presentRequest(r));
  }

  // ------------------------------------------------------------------
  // Appointments
  // ------------------------------------------------------------------
  private async blocked(a: string, b: string) {
    const r = await db.query.userBlocks.findFirst({ where: or(and(eq(userBlocks.blockerId, a), eq(userBlocks.blockedId, b)), and(eq(userBlocks.blockerId, b), eq(userBlocks.blockedId, a))) });
    return !!r;
  }

  /** The chat thread between a buyer and a store about one service. */
  async conversationFor(buyerId: string, serviceId: string) {
    const s = await db.query.services.findFirst({ where: eq(services.id, serviceId), with: { store: { columns: { id: true, ownerId: true, status: true } } } });
    if (!s || !s.isActive || s.store.status !== 'APPROVED') throw new NotFoundException('This service is no longer available.');
    if (s.store.ownerId === buyerId) throw new ForbiddenException('This is your own service.');
    if (await this.blocked(buyerId, s.store.ownerId)) throw new ForbiddenException('You can’t message this seller.');
    const existing = await db.query.conversations.findFirst({ where: and(eq(conversations.serviceId, serviceId), eq(conversations.buyerId, buyerId), eq(conversations.storeId, s.storeId)) });
    const id = existing?.id ?? (await db.insert(conversations).values({ serviceId, buyerId, storeId: s.storeId }).returning())[0].id;
    return { conversationId: id, service: s };
  }

  private async post(conversationId: string, senderId: string, body: string, recipients: string[]) {
    const [m] = await db.insert(messages).values({ conversationId, senderId, body }).returning();
    try {
      this.gateway.broadcast(conversationId, m, recipients);
    } catch {
      /* socket server not running (serverless) — clients poll */
    }
  }

  async requestAppointment(buyerId: string, serviceId: string, dto: AppointmentRequestDto) {
    const at = new Date(dto.scheduledAt);
    const now = Date.now();
    if (isNaN(at.getTime()) || at.getTime() < now + 30 * 60 * 1000) throw new BadRequestException('Please pick a time at least 30 minutes from now.');
    if (at.getTime() > now + 90 * 24 * 3600 * 1000) throw new BadRequestException('Please pick a time within the next 3 months.');
    noContact(dto.vehicle, dto.note);
    const { conversationId, service } = await this.conversationFor(buyerId, serviceId);
    const open = await db.query.appointments.findFirst({
      where: and(eq(appointments.serviceId, serviceId), eq(appointments.buyerId, buyerId), inArray(appointments.status, [...OPEN]), sql`${appointments.scheduledAt} > now()`),
    });
    if (open) throw new ConflictException('You already have an appointment for this service. Cancel it first to ask for a different time.');
    await hit(`appt:${buyerId}`, 10, 86400, 'You’ve asked for a lot of appointments today. Please try again tomorrow.');

    const [a] = await db
      .insert(appointments)
      .values({ serviceId, storeId: service.storeId, buyerId, conversationId, scheduledAt: at, vehicle: dto.vehicle?.trim() || null, note: dto.note?.trim() || null })
      .returning();
    const lines = [`📅 Appointment request: ${when(at)}`, `Service: ${service.title}`];
    if (a.vehicle) lines.push(`Vehicle: ${a.vehicle}`);
    if (a.note) lines.push(`Note: ${a.note}`);
    await this.post(conversationId, buyerId, lines.join('\n'), [buyerId, service.store.ownerId]);

    const seller = await db.query.users.findFirst({ where: eq(users.id, service.store.ownerId), columns: { email: true } });
    if (seller) {
      await this.mail.sendInfo(seller.email, 'New appointment request', `A customer asked for “${service.title}” on ${when(at)}. Open AutoGuide → Account → Appointments to accept or decline.`);
    }
    return this.getAppointment(buyerId, a.id);
  }

  private async load(id: string) {
    return db.query.appointments.findFirst({ where: eq(appointments.id, id), with: apptWith });
  }

  private presentAppt(a: NonNullable<Awaited<ReturnType<ServicesService['load']>>>, viewerId: string) {
    const viewerIsSeller = a.store.ownerId === viewerId;
    const { ownerId, addressLine1, addressLine2, ...store } = a.store;
    const accepted = a.status === 'ACCEPTED' || a.status === 'COMPLETED';
    return {
      id: a.id,
      status: a.status,
      // A request nobody answered before its time has passed.
      expired: a.status === 'REQUESTED' && a.scheduledAt.getTime() < Date.now(),
      scheduledAt: a.scheduledAt,
      vehicle: a.vehicle,
      note: a.note,
      sellerNote: a.sellerNote,
      createdAt: a.createdAt,
      respondedAt: a.respondedAt,
      conversationId: a.conversationId,
      viewerIsSeller,
      service: { id: a.service.id, title: a.service.title, type: a.service.type, image: a.service.images[0]?.url ?? null, priceFrom: a.service.priceFrom != null ? Number(a.service.priceFrom) : null, priceTo: a.service.priceTo != null ? Number(a.service.priceTo) : null, durationMinutes: a.service.durationMinutes },
      // The buyer sees the shop address once the appointment is accepted.
      store: { ...store, address: accepted ? [addressLine1, addressLine2].filter(Boolean).join(', ') : null },
      buyer: { id: a.buyer.id, fullName: shortName(a.buyer.fullName) },
    };
  }

  async getAppointment(userId: string, id: string) {
    const a = await this.load(id);
    if (!a || (a.buyerId !== userId && a.store.ownerId !== userId)) throw new NotFoundException('Appointment not found.');
    return this.presentAppt(a, userId);
  }

  async listAppointments(userId: string, as: 'buyer' | 'seller' = 'buyer') {
    let where;
    if (as === 'seller') {
      const store = await db.query.stores.findFirst({ where: eq(stores.ownerId, userId), columns: { id: true } });
      if (!store) return [];
      where = eq(appointments.storeId, store.id);
    } else {
      where = eq(appointments.buyerId, userId);
    }
    const rows = await db.query.appointments.findMany({ where, orderBy: desc(appointments.scheduledAt), limit: 200, with: apptWith });
    return rows.map((a) => this.presentAppt(a, userId));
  }

  async respond(userId: string, id: string, action: 'accept' | 'decline' | 'complete' | 'cancel', note?: string) {
    const a = await this.load(id);
    if (!a || (a.buyerId !== userId && a.store.ownerId !== userId)) throw new NotFoundException('Appointment not found.');
    const isSeller = a.store.ownerId === userId;
    const clean = note?.trim() || null;
    noContact(clean);
    const past = a.scheduledAt.getTime() < Date.now();
    let status: 'ACCEPTED' | 'DECLINED' | 'COMPLETED' | 'CANCELLED';
    if (action === 'accept' || action === 'decline') {
      if (!isSeller) throw new ForbiddenException('Only the seller can do this.');
      if (a.status !== 'REQUESTED') throw new BadRequestException('This appointment has already been answered.');
      if (action === 'accept' && past) throw new BadRequestException('This time has already passed. Ask the customer to pick a new time in the chat.');
      status = action === 'accept' ? 'ACCEPTED' : 'DECLINED';
    } else if (action === 'complete') {
      if (!isSeller) throw new ForbiddenException('Only the seller can do this.');
      if (a.status !== 'ACCEPTED') throw new BadRequestException('Only accepted appointments can be marked as done.');
      status = 'COMPLETED';
    } else {
      if (a.status !== 'REQUESTED' && a.status !== 'ACCEPTED') throw new BadRequestException('This appointment can’t be cancelled.');
      status = 'CANCELLED';
    }
    await db.update(appointments).set({ status, respondedAt: new Date(), ...(isSeller ? { sellerNote: clean } : {}) }).where(eq(appointments.id, id));

    const label = { ACCEPTED: '✅ Appointment accepted', DECLINED: '❌ Appointment declined', COMPLETED: '🏁 Appointment completed', CANCELLED: '🚫 Appointment cancelled' }[status];
    const body = `${label}: ${when(a.scheduledAt)}\nService: ${a.service.title}${clean ? `\nNote: ${clean}` : ''}`;
    if (a.conversationId && status !== 'COMPLETED') await this.post(a.conversationId, userId, body, [a.buyerId, a.store.ownerId]);

    const otherId = isSeller ? a.buyerId : a.store.ownerId;
    const other = await db.query.users.findFirst({ where: eq(users.id, otherId), columns: { email: true } });
    if (other && status !== 'COMPLETED') {
      const who = isSeller ? a.store.name : 'The customer';
      const msg = {
        ACCEPTED: `${who} accepted your appointment for “${a.service.title}” on ${when(a.scheduledAt)}.`,
        DECLINED: `${who} couldn’t take your appointment for “${a.service.title}” on ${when(a.scheduledAt)}.`,
        CANCELLED: `${who} cancelled the appointment for “${a.service.title}” on ${when(a.scheduledAt)}.`,
      }[status];
      await this.mail.sendInfo(other.email, label.replace(/^\S+\s/, ''), `${msg}${clean ? ` Note: “${clean}”.` : ''} Open AutoGuide to see the details or chat.`);
    }
    return this.getAppointment(userId, id);
  }

  async sellerSummary(userId: string) {
    const store = await db.query.stores.findFirst({ where: eq(stores.ownerId, userId), columns: { id: true } });
    if (!store) return { pendingAppointments: 0, upcomingAppointments: 0, services: 0 };
    const [[p], [u], [s]] = await Promise.all([
      db.select({ n: count() }).from(appointments).where(and(eq(appointments.storeId, store.id), eq(appointments.status, 'REQUESTED'), sql`${appointments.scheduledAt} > now()`)),
      db.select({ n: count() }).from(appointments).where(and(eq(appointments.storeId, store.id), eq(appointments.status, 'ACCEPTED'), sql`${appointments.scheduledAt} > now()`)),
      db.select({ n: count() }).from(services).where(and(eq(services.storeId, store.id), eq(services.isActive, true))),
    ]);
    return { pendingAppointments: Number(p.n), upcomingAppointments: Number(u.n), services: Number(s.n) };
  }

  // ------------------------------------------------------------------
  // Admin
  // ------------------------------------------------------------------
  async adminTypes() {
    await ensureDefaultServiceTypes();
    const counts = await db.select({ typeId: services.typeId, n: count() }).from(services).where(eq(services.isActive, true)).groupBy(services.typeId);
    const m = new Map(counts.map((c) => [c.typeId, Number(c.n)]));
    const rows = await db.query.serviceTypes.findMany({ orderBy: [asc(serviceTypes.sortOrder), asc(serviceTypes.name)] });
    return rows.map((t) => ({ ...t, serviceCount: m.get(t.id) ?? 0 }));
  }

  async adminCreateType(adminId: string, dto: AdminServiceTypeDto) {
    const name = dto.name.trim().replace(/\s+/g, ' ');
    const slug = slugify(name);
    const existing = await db.query.serviceTypes.findFirst({ where: eq(serviceTypes.slug, slug) });
    if (existing) {
      if (existing.isActive) throw new ConflictException(`“${existing.name}” already exists.`);
      await db.update(serviceTypes).set({ isActive: true, name }).where(eq(serviceTypes.id, existing.id));
      await audit(adminId, 'service_type_restore', 'service_type', existing.id, name);
      return db.query.serviceTypes.findFirst({ where: eq(serviceTypes.id, existing.id) });
    }
    const [{ max }] = await db.select({ max: sql<number>`coalesce(max(${serviceTypes.sortOrder}), 0)::int` }).from(serviceTypes);
    const [t] = await db.insert(serviceTypes).values({ name, slug, icon: dto.icon || 'construct-outline', description: dto.description?.trim() || null, sortOrder: Number(max) + 1 }).returning();
    await audit(adminId, 'service_type_create', 'service_type', t.id, name);
    return t;
  }

  async adminUpdateType(adminId: string, id: string, dto: AdminServiceTypeUpdateDto) {
    const t = await db.query.serviceTypes.findFirst({ where: eq(serviceTypes.id, id) });
    if (!t) throw new NotFoundException('Service type not found.');
    const set: any = {};
    if (dto.name != null) {
      const name = dto.name.trim().replace(/\s+/g, ' ');
      const slug = slugify(name);
      const clash = await db.query.serviceTypes.findFirst({ where: eq(serviceTypes.slug, slug) });
      if (clash && clash.id !== id) throw new ConflictException(`“${clash.name}” already exists.`);
      Object.assign(set, { name, slug });
    }
    if (dto.icon != null) set.icon = dto.icon;
    if (dto.description !== undefined) set.description = dto.description?.trim() || null;
    if (dto.isActive != null) set.isActive = dto.isActive;
    if (dto.sortOrder != null) set.sortOrder = dto.sortOrder;
    if (Object.keys(set).length) await db.update(serviceTypes).set(set).where(eq(serviceTypes.id, id));
    await audit(adminId, dto.isActive === false ? 'service_type_hide' : dto.isActive === true ? 'service_type_show' : 'service_type_update', 'service_type', id, set.name ?? t.name);
    return db.query.serviceTypes.findFirst({ where: eq(serviceTypes.id, id) });
  }

  async adminRequests(status: 'PENDING' | 'APPROVED' | 'DECLINED' = 'PENDING') {
    const rows = await db.query.serviceTypeRequests.findMany({
      where: eq(serviceTypeRequests.status, status),
      orderBy: status === 'PENDING' ? asc(serviceTypeRequests.createdAt) : desc(serviceTypeRequests.reviewedAt),
      with: {
        store: { columns: { id: true, name: true, slug: true, city: true, district: true } },
        requestedBy: { columns: { fullName: true, email: true } },
        serviceType: { columns: { id: true, name: true } },
      },
      limit: 200,
    });
    return rows;
  }

  async pendingRequestCount() {
    const [{ n }] = await db.select({ n: count() }).from(serviceTypeRequests).where(eq(serviceTypeRequests.status, 'PENDING'));
    return Number(n);
  }

  private async requestOr404(id: string) {
    const r = await db.query.serviceTypeRequests.findFirst({ where: eq(serviceTypeRequests.id, id), with: { requestedBy: { columns: { email: true } } } });
    if (!r) throw new NotFoundException('Request not found.');
    if (r.status !== 'PENDING') throw new BadRequestException('This request has already been answered.');
    return r;
  }

  async adminApprove(adminId: string, id: string, dto: AdminRequestApproveDto) {
    const r = await this.requestOr404(id);
    let type;
    if (dto.existingTypeId) {
      type = await db.query.serviceTypes.findFirst({ where: eq(serviceTypes.id, dto.existingTypeId) });
      if (!type) throw new NotFoundException('Service type not found.');
      if (!type.isActive) await db.update(serviceTypes).set({ isActive: true }).where(eq(serviceTypes.id, type.id));
    } else {
      const name = (dto.name ?? r.name).trim().replace(/\s+/g, ' ');
      const existing = await db.query.serviceTypes.findFirst({ where: eq(serviceTypes.slug, slugify(name)) });
      if (existing) {
        if (!existing.isActive) await db.update(serviceTypes).set({ isActive: true }).where(eq(serviceTypes.id, existing.id));
        type = existing;
      } else {
        type = await this.adminCreateType(adminId, { name, icon: dto.icon, description: dto.description });
      }
    }
    await db.update(serviceTypeRequests).set({ status: 'APPROVED', serviceTypeId: type!.id, reviewedById: adminId, reviewedAt: new Date() }).where(eq(serviceTypeRequests.id, id));
    await audit(adminId, 'service_request_approve', 'service_request', id, type!.name);
    await this.mail.sendInfo(r.requestedBy.email, 'Your service type was added', `Good news — “${type!.name}” is now in the AutoGuide service list. You can add your service from Account → My services.`);
    return { ok: true, serviceType: type };
  }

  async adminDecline(adminId: string, id: string, note: string) {
    const r = await this.requestOr404(id);
    await db.update(serviceTypeRequests).set({ status: 'DECLINED', reviewNote: note.trim(), reviewedById: adminId, reviewedAt: new Date() }).where(eq(serviceTypeRequests.id, id));
    await audit(adminId, 'service_request_decline', 'service_request', id, note);
    await this.mail.sendInfo(r.requestedBy.email, 'About your service type request', `We didn’t add “${r.name}” to the service list. ${note.trim()}`);
    return { ok: true };
  }
}
