import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, count, desc, eq, inArray, isNull } from 'drizzle-orm';
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { db } from '../db/client';
import { categories, categoryRequests, users } from '../db/schema';
import { requireApprovedStore } from '../common/seller-access';
import { checkForContactInfo } from '../common/contact-filter';
import { hit } from '../security/rate-limit';
import { MailService } from '../mail/mail.service';
import { audit } from '../admin/audit';
import { slugify } from '../services/service-types';

export class CategoryRequestDto {
  @IsString() @MinLength(3) @MaxLength(100) name: string;
  // Main group it belongs under, if the seller knows.
  @IsOptional() @IsString() parentId?: string;
  @IsOptional() @IsString() @MaxLength(500) note?: string;
}

export class AdminCategoryApproveDto {
  // Either add a new sub-category (name + main group)…
  @IsOptional() @IsString() @MinLength(2) @MaxLength(100) name?: string;
  @IsOptional() @IsString() parentId?: string;
  // …or point the seller to one that already exists.
  @IsOptional() @IsString() existingCategoryId?: string;
}

export class AdminCategoryDeclineDto {
  @IsString() @MinLength(3) @MaxLength(500) note: string;
}

export class CategoryRequestListQuery {
  @IsOptional() @IsIn(['PENDING', 'APPROVED', 'DECLINED']) status?: 'PENDING' | 'APPROVED' | 'DECLINED';
}

const clean = (s: string) => s.trim().replace(/\s+/g, ' ');

// "My part's category isn't listed" - sellers ask, admins add it.
@Injectable()
export class CategoryRequestsService {
  constructor(private readonly mail: MailService) {}

  private async topLevel(id?: string | null) {
    if (!id) return null;
    const c = await db.query.categories.findFirst({ where: eq(categories.id, id) });
    if (!c) throw new NotFoundException('Category group not found.');
    if (c.parentId) throw new BadRequestException('Choose a main category group.');
    return c;
  }

  async request(userId: string, dto: CategoryRequestDto) {
    const store = await requireApprovedStore(userId);
    const name = clean(dto.name);
    for (const t of [name, dto.note]) {
      if (t && checkForContactInfo(t).blocked) throw new BadRequestException('Please don’t include phone numbers, emails or links.');
    }
    const parent = await this.topLevel(dto.parentId);
    const slug = slugify(name);
    const existing = await db.query.categories.findFirst({ where: eq(categories.slug, slug) });
    if (existing?.parentId) {
      const p = await db.query.categories.findFirst({ where: eq(categories.id, existing.parentId) });
      throw new ConflictException(`“${existing.name}” is already a category${p ? ` under ${p.name}` : ''} - choose it for your listing.`);
    }
    const mine = await db.query.categoryRequests.findMany({ where: and(eq(categoryRequests.storeId, store.id), eq(categoryRequests.status, 'PENDING')) });
    const dup = mine.find((r) => slugify(r.name) === slug);
    if (dup) return this.present(dup);
    if (mine.length >= 5) throw new BadRequestException('You already have 5 category requests waiting. We’ll get back to you soon.');
    await hit(`cat-req:${store.id}`, 10, 86400, 'You’ve sent a lot of requests today. Please try again tomorrow.');
    const [r] = await db
      .insert(categoryRequests)
      .values({ storeId: store.id, requestedById: userId, name, parentId: parent?.id ?? null, note: dto.note?.trim() || null })
      .returning();

    const admins = await db.query.users.findMany({ where: and(eq(users.role, 'ADMIN'), isNull(users.deletedAt)), columns: { email: true } });
    for (const a of admins) {
      await this.mail.sendInfo(
        a.email,
        'New product category requested',
        `${store.name} asked for a new product category: “${name}”${parent ? ` (under ${parent.name})` : ''}.${r.note ? ` Their note: “${r.note}”.` : ''} Review it in the admin panel under Categories.`,
      );
    }
    return this.present(r);
  }

  private present(r: typeof categoryRequests.$inferSelect) {
    return { id: r.id, name: r.name, parentId: r.parentId, note: r.note, status: r.status, reviewNote: r.reviewNote, categoryId: r.categoryId, createdAt: r.createdAt, reviewedAt: r.reviewedAt };
  }

  async mine(userId: string) {
    const store = await requireApprovedStore(userId);
    const rows = await db.query.categoryRequests.findMany({ where: eq(categoryRequests.storeId, store.id), orderBy: desc(categoryRequests.createdAt), limit: 50 });
    return rows.map((r) => this.present(r));
  }

  // ---------------- admin ----------------
  async adminList(status: 'PENDING' | 'APPROVED' | 'DECLINED' = 'PENDING') {
    const rows = await db.query.categoryRequests.findMany({
      where: eq(categoryRequests.status, status),
      orderBy: status === 'PENDING' ? asc(categoryRequests.createdAt) : desc(categoryRequests.reviewedAt),
      with: {
        store: { columns: { id: true, name: true, slug: true, city: true, district: true } },
        requestedBy: { columns: { fullName: true, email: true } },
      },
      limit: 200,
    });
    const ids = [...new Set(rows.flatMap((r) => [r.parentId, r.categoryId]).filter(Boolean) as string[])];
    const cats = ids.length ? await db.select({ id: categories.id, name: categories.name, parentId: categories.parentId }).from(categories).where(inArray(categories.id, ids)) : [];
    const byId = new Map(cats.map((c) => [c.id, c]));
    return rows.map((r) => ({ ...r, parent: r.parentId ? byId.get(r.parentId) ?? null : null, category: r.categoryId ? byId.get(r.categoryId) ?? null : null }));
  }

  async pendingCount() {
    const [{ n }] = await db.select({ n: count() }).from(categoryRequests).where(eq(categoryRequests.status, 'PENDING'));
    return Number(n);
  }

  private async pendingOr404(id: string) {
    const r = await db.query.categoryRequests.findFirst({ where: eq(categoryRequests.id, id), with: { requestedBy: { columns: { email: true } } } });
    if (!r) throw new NotFoundException('Request not found.');
    if (r.status !== 'PENDING') throw new BadRequestException('This request has already been answered.');
    return r;
  }

  async adminApprove(adminId: string, id: string, dto: AdminCategoryApproveDto) {
    const r = await this.pendingOr404(id);
    let cat: typeof categories.$inferSelect | undefined;
    if (dto.existingCategoryId) {
      cat = await db.query.categories.findFirst({ where: eq(categories.id, dto.existingCategoryId) });
      if (!cat) throw new NotFoundException('Category not found.');
      if (!cat.parentId) throw new BadRequestException('Pick a sub-category, not a main group.');
    } else {
      const parent = await this.topLevel(dto.parentId ?? r.parentId);
      if (!parent) throw new BadRequestException('Choose the main group this category goes under.');
      const name = clean(dto.name ?? r.name);
      let slug = slugify(name);
      const clash = await db.query.categories.findFirst({ where: eq(categories.slug, slug) });
      if (clash && clash.parentId === parent.id) cat = clash;
      else {
        if (clash) slug = `${slugify(parent.name)}-${slug}`.slice(0, 150);
        const again = await db.query.categories.findFirst({ where: eq(categories.slug, slug) });
        cat = again ?? (await db.insert(categories).values({ name, slug, parentId: parent.id }).returning())[0];
      }
    }
    await db.update(categoryRequests).set({ status: 'APPROVED', categoryId: cat!.id, reviewedById: adminId, reviewedAt: new Date() }).where(eq(categoryRequests.id, id));
    await audit(adminId, 'category_request_approve', 'category_request', id, cat!.name);
    await this.mail.sendInfo(r.requestedBy.email, 'Your product category was added', `Good news - “${cat!.name}” is now a category on AutoGuide. You can choose it when you add or edit a listing.`);
    return { ok: true, category: cat };
  }

  async adminDecline(adminId: string, id: string, note: string) {
    const r = await this.pendingOr404(id);
    await db.update(categoryRequests).set({ status: 'DECLINED', reviewNote: note.trim(), reviewedById: adminId, reviewedAt: new Date() }).where(eq(categoryRequests.id, id));
    await audit(adminId, 'category_request_decline', 'category_request', id, note);
    await this.mail.sendInfo(r.requestedBy.email, 'About your category request', `We didn’t add “${r.name}” as a product category. ${note.trim()}`);
    return { ok: true };
  }
}
