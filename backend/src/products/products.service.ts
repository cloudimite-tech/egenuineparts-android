import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, avg, count, desc, eq, gte, ilike, inArray, lte, or, sql } from 'drizzle-orm';
import { db } from '../db/client';
import {
  categories,
  orderItems,
  orders,
  productFitments,
  productImages,
  products,
  reviews,
  stores,
} from '../db/schema';
import {
  CreateProductDto,
  CreateReviewDto,
  ProductQueryDto,
  UpdateProductDto,
} from './dto/product.dto';
import { discountPct, presentPrice } from './pricing';

type Fitment = { make: string; model: string; yearFrom: number; yearTo: number };

export function fitsVehicle(fitments: Fitment[], make?: string, model?: string, year?: number) {
  if (!make || !model || !year) return null;
  if (fitments.length === 0) return null; // universal / unknown fitment
  return fitments.some(
    (f) =>
      f.make.toLowerCase() === make.toLowerCase() &&
      f.model.toLowerCase() === model.toLowerCase() &&
      year >= f.yearFrom &&
      year <= f.yearTo,
  );
}

@Injectable()
export class ProductsService {
  // A category filter on "Brakes" should also return products listed under
  // "Brake pads", "Brake calipers" etc., so expand to all descendants.
  private async categoryWithDescendants(categoryId: string) {
    const all = await db.select({ id: categories.id, parentId: categories.parentId }).from(categories);
    const ids = new Set([categoryId]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const c of all) {
        if (c.parentId && ids.has(c.parentId) && !ids.has(c.id)) {
          ids.add(c.id);
          grew = true;
        }
      }
    }
    return [...ids];
  }

  async ratingsFor(productIds: string[]) {
    if (productIds.length === 0) return new Map<string, { avgRating: string | null; reviewCount: number }>();
    const rows = await db
      .select({ productId: reviews.productId, avgRating: avg(reviews.rating), reviewCount: count(reviews.id) })
      .from(reviews)
      .where(inArray(reviews.productId, productIds))
      .groupBy(reviews.productId);
    return new Map(
      rows.map((r) => [
        r.productId,
        { avgRating: r.avgRating ? Number(r.avgRating).toFixed(1) : null, reviewCount: Number(r.reviewCount) },
      ]),
    );
  }

  async soldCounts(productIds: string[]) {
    if (productIds.length === 0) return new Map<string, number>();
    const rows = await db
      .select({ productId: orderItems.productId, sold: sql<number>`coalesce(sum(${orderItems.quantity}), 0)` })
      .from(orderItems)
      .where(and(inArray(orderItems.productId, productIds), sql`${orderItems.fulfillmentStatus} <> 'CANCELLED'`))
      .groupBy(orderItems.productId);
    return new Map(rows.map((r) => [r.productId, Number(r.sold)]));
  }

  async list(query: ProductQueryDto) {
    const conditions = [eq(products.isActive, true)] as any[];
    if (query.categoryId) {
      conditions.push(inArray(products.categoryId, await this.categoryWithDescendants(query.categoryId)));
    }
    if (query.storeId) conditions.push(eq(products.storeId, query.storeId));
    if (query.brands) {
      const brands = query.brands.split(',').map((b) => b.trim()).filter(Boolean);
      if (brands.length) conditions.push(or(...brands.map((b) => ilike(products.brand, b))));
    }
    if (query.q) {
      const q = `%${query.q.trim()}%`;
      conditions.push(or(ilike(products.title, q), ilike(products.brand, q), ilike(products.partNumber, q)));
    }
    const orderBy = desc(products.createdAt);

    const rows = await db.query.products.findMany({
      where: and(...conditions),
      with: {
        images: { orderBy: asc(productImages.position) },
        store: { columns: { id: true, name: true, slug: true, verified: true } },
        fitments: true,
        category: { columns: { id: true, name: true, slug: true, icon: true } },
      },
      orderBy,
      limit: 300,
    });

    const ids = rows.map((r) => r.id);
    const [ratings, sold] = await Promise.all([this.ratingsFor(ids), this.soldCounts(ids)]);

    let result = rows.map((p) => ({
      ...presentPrice(p),
      avgRating: ratings.get(p.id)?.avgRating ?? null,
      reviewCount: ratings.get(p.id)?.reviewCount ?? 0,
      soldCount: sold.get(p.id) ?? 0,
      fitsVehicle: fitsVehicle(p.fitments, query.make, query.model, query.year),
    }));

    // With a vehicle selected, hide parts known NOT to fit; keep exact fits
    // first, then universal parts (no fitment data).
    if (query.make && query.model && query.year) {
      result = result.filter((p) => p.fitsVehicle !== false);
      if (!query.sort || query.sort === 'best_match') {
        result.sort((a, b) => Number(b.fitsVehicle === true) - Number(a.fitsVehicle === true));
      }
    }
    // Price filters/sorts use the price the buyer actually pays (sale-aware).
    if (query.minPrice != null) result = result.filter((p) => p.priceLkr >= query.minPrice!);
    if (query.maxPrice != null) result = result.filter((p) => p.priceLkr <= query.maxPrice!);
    if (query.onSale === 'true') result = result.filter((p) => p.onSale || discountPct(p) > 0);
    if (query.sort === 'price_asc') result.sort((a, b) => a.priceLkr - b.priceLkr);
    if (query.sort === 'price_desc') result.sort((a, b) => b.priceLkr - a.priceLkr);
    if (query.sort === 'rating') {
      result.sort((a, b) => Number(b.avgRating ?? 0) - Number(a.avgRating ?? 0));
    }
    return result.slice(0, 100);
  }

  async get(id: string) {
    const product = await db.query.products.findFirst({
      where: eq(products.id, id),
      with: {
        images: { orderBy: asc(productImages.position) },
        fitments: true,
        store: true,
        category: true,
      },
    });
    if (!product) throw new NotFoundException('Product not found.');

    const [ratings, sold] = await Promise.all([this.ratingsFor([id]), this.soldCounts([id])]);

    const breakdownRows = await db
      .select({ rating: reviews.rating, n: count(reviews.id) })
      .from(reviews)
      .where(eq(reviews.productId, id))
      .groupBy(reviews.rating);
    const ratingBreakdown: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const r of breakdownRows) ratingBreakdown[r.rating] = Number(r.n);

    const productReviews = await db.query.reviews.findMany({
      where: eq(reviews.productId, id),
      with: { user: { columns: { fullName: true } } },
      orderBy: desc(reviews.createdAt),
      limit: 30,
    });

    const [storeRating] = await db
      .select({ avgRating: avg(reviews.rating), reviewCount: count(reviews.id) })
      .from(reviews)
      .innerJoin(products, eq(reviews.productId, products.id))
      .where(eq(products.storeId, product.storeId));

    const { ownerId, ...publicStore } = product.store;
    return {
      ...presentPrice(product),
      store: {
        ...publicStore,
        stats: {
          avgRating: storeRating?.avgRating ? Number(storeRating.avgRating).toFixed(1) : null,
          reviewCount: Number(storeRating?.reviewCount ?? 0),
        },
      },
      avgRating: ratings.get(id)?.avgRating ?? null,
      reviewCount: ratings.get(id)?.reviewCount ?? 0,
      soldCount: sold.get(id) ?? 0,
      ratingBreakdown,
      reviews: productReviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt,
        // First name + initial only — reviewers aren't identifiable.
        author: shortName(r.user.fullName),
      })),
    };
  }

  async mine(userId: string) {
    const store = await this.getOwnStoreOrThrow(userId);
    const rows = await db.query.products.findMany({
      where: and(eq(products.storeId, store.id), eq(products.isActive, true)),
      with: { images: { orderBy: asc(productImages.position) }, fitments: true, category: true },
      orderBy: desc(products.createdAt),
    });
    const ids = rows.map((r) => r.id);
    const [ratings, sold] = await Promise.all([this.ratingsFor(ids), this.soldCounts(ids)]);
    return rows.map((p) => ({
      ...presentPrice(p),
      avgRating: ratings.get(p.id)?.avgRating ?? null,
      reviewCount: ratings.get(p.id)?.reviewCount ?? 0,
      soldCount: sold.get(p.id) ?? 0,
    }));
  }

  // The Home screen "highlight" rail: a live flash sale if any seller is
  // running one, otherwise discounted deals, otherwise best sellers /
  // newest — so the slot is never empty.
  async highlights(query: ProductQueryDto) {
    const all = await this.list({ make: query.make, model: query.model, year: query.year } as ProductQueryDto);
    const inStock = all.filter((p) => p.stock > 0);

    const MIN_RAIL = 6;
    const flash = inStock
      .filter((p) => p.onSale)
      .sort((a, b) => new Date(a.saleEndsAt as any).getTime() - new Date(b.saleEndsAt as any).getTime());
    const deals = inStock
      .filter((p) => !p.onSale && discountPct(p) > 0)
      .sort((a, b) => discountPct(b) - discountPct(a));
    const bestSellers = [...inStock].sort(
      (a, b) => b.soldCount - a.soldCount || Number(b.avgRating ?? 0) - Number(a.avgRating ?? 0),
    );

    if (flash.length) {
      const best = Math.max(...flash.map((p) => discountPct(p)));
      // Flash items always lead; if there are only a few, top the rail up
      // with hot deals and then best sellers so it never looks empty.
      const rail = [...flash];
      for (const p of [...deals, ...bestSellers]) {
        if (rail.length >= Math.max(MIN_RAIL, flash.length)) break;
        if (!rail.some((r) => r.id === p.id)) rail.push(p);
      }
      return {
        mode: 'flash' as const,
        title: 'Flash Sale',
        subtitle: best ? `Up to ${best}% off · limited time` : 'Limited-time prices',
        endsAt: flash[0].saleEndsAt,
        flashCount: flash.length,
        products: rail.slice(0, 12),
      };
    }

    if (deals.length >= 2) {
      return {
        mode: 'deals' as const,
        title: 'Hot Deals',
        subtitle: `Save up to ${discountPct(deals[0])}% today`,
        endsAt: null,
        flashCount: 0,
        products: deals.slice(0, 12),
      };
    }

    const anySold = inStock.some((p) => p.soldCount > 0);
    const top = [...inStock].sort((a, b) =>
      anySold
        ? b.soldCount - a.soldCount || Number(b.avgRating ?? 0) - Number(a.avgRating ?? 0)
        : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    return {
      mode: anySold ? ('top' as const) : ('new' as const),
      title: anySold ? 'Top Picks' : 'New Arrivals',
      subtitle: anySold ? 'Best sellers right now' : 'Just listed by our sellers',
      endsAt: null,
      flashCount: 0,
      products: top.slice(0, 12),
    };
  }

  private async assertOwnsProduct(userId: string, productId: string) {
    const product = await db.query.products.findFirst({
      where: eq(products.id, productId),
      with: { store: true },
    });
    if (!product || !product.isActive) throw new NotFoundException('Product not found.');
    if (product.store.ownerId !== userId) throw new ForbiddenException('You do not own this product.');
    return product;
  }

  private async getOwnStoreOrThrow(userId: string) {
    const store = await db.query.stores.findFirst({ where: eq(stores.ownerId, userId) });
    if (!store) throw new ForbiddenException('Create a store before listing products.');
    return store;
  }

  private validate(dto: CreateProductDto) {
    if (dto.compareAtPrice != null && dto.compareAtPrice <= dto.price) {
      // A "was" price lower than the price makes no sense — just drop it.
      dto.compareAtPrice = null;
    }
    if (dto.salePrice != null || dto.saleEndsAt != null) {
      if (dto.salePrice == null || dto.saleEndsAt == null) {
        throw new BadRequestException('A sale needs both a sale price and an end date.');
      }
      if (dto.salePrice >= dto.price) throw new BadRequestException('Sale price must be lower than the regular price.');
      if (new Date(dto.saleEndsAt) <= new Date()) throw new BadRequestException('Sale end date must be in the future.');
    }
    for (const f of dto.fitments ?? []) {
      if (f.yearFrom > f.yearTo) throw new BadRequestException('Fitment "year from" must be before "year to".');
    }
  }

  private async replaceMedia(productId: string, dto: CreateProductDto) {
    if (dto.images) {
      await db.delete(productImages).where(eq(productImages.productId, productId));
      if (dto.images.length) {
        await db
          .insert(productImages)
          .values(dto.images.map((url, position) => ({ productId, url, position })));
      }
    }
    if (dto.fitments) {
      await db.delete(productFitments).where(eq(productFitments.productId, productId));
      if (dto.fitments.length) {
        await db.insert(productFitments).values(dto.fitments.map((f) => ({ ...f, productId })));
      }
    }
  }

  async create(userId: string, dto: CreateProductDto) {
    const store = await this.getOwnStoreOrThrow(userId);
    this.validate(dto);
    const [product] = await db
      .insert(products)
      .values({
        storeId: store.id,
        categoryId: dto.categoryId ?? null,
        brand: dto.brand.trim(),
        title: dto.title.trim(),
        partNumber: dto.partNumber?.trim() || null,
        description: dto.description?.trim() || null,
        currency: dto.currency ?? 'LKR',
        price: String(dto.price),
        compareAtPrice: dto.compareAtPrice != null ? String(dto.compareAtPrice) : null,
        stock: dto.stock ?? 0,
        condition: dto.condition ?? 'NEW',
        warrantyMonths: dto.warrantyMonths ?? null,
        salePrice: dto.salePrice != null ? String(dto.salePrice) : null,
        saleEndsAt: dto.saleEndsAt ? new Date(dto.saleEndsAt) : null,
      })
      .returning();
    await this.replaceMedia(product.id, dto);
    return this.get(product.id);
  }

  async update(userId: string, productId: string, dto: UpdateProductDto) {
    await this.assertOwnsProduct(userId, productId);
    this.validate(dto);
    await db
      .update(products)
      .set({
        categoryId: dto.categoryId ?? null,
        brand: dto.brand.trim(),
        title: dto.title.trim(),
        partNumber: dto.partNumber?.trim() || null,
        description: dto.description?.trim() || null,
        currency: dto.currency ?? 'LKR',
        price: String(dto.price),
        compareAtPrice: dto.compareAtPrice != null ? String(dto.compareAtPrice) : null,
        stock: dto.stock ?? 0,
        condition: dto.condition ?? 'NEW',
        warrantyMonths: dto.warrantyMonths ?? null,
        salePrice: dto.salePrice != null ? String(dto.salePrice) : null,
        saleEndsAt: dto.saleEndsAt ? new Date(dto.saleEndsAt) : null,
      })
      .where(eq(products.id, productId));
    await this.replaceMedia(productId, dto);
    return this.get(productId);
  }

  async remove(userId: string, productId: string) {
    await this.assertOwnsProduct(userId, productId);
    await db.update(products).set({ isActive: false }).where(eq(products.id, productId));
    return { success: true };
  }

  async addReview(userId: string, productId: string, dto: CreateReviewDto) {
    const [purchase] = await db
      .select({ id: orderItems.id })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(
        and(
          eq(orderItems.productId, productId),
          eq(orders.buyerId, userId),
          eq(orderItems.fulfillmentStatus, 'DELIVERED'),
        ),
      )
      .limit(1);
    if (!purchase) {
      throw new ForbiddenException('You can review a part once it has been delivered to you.');
    }
    const existing = await db.query.reviews.findFirst({
      where: and(eq(reviews.productId, productId), eq(reviews.userId, userId)),
    });
    if (existing) throw new ConflictException('You have already reviewed this part.');

    const [review] = await db
      .insert(reviews)
      .values({ productId, userId, rating: dto.rating, comment: dto.comment?.trim() || null })
      .returning();
    return review;
  }

  async myReviewedProductIds(userId: string) {
    const rows = await db.select({ productId: reviews.productId }).from(reviews).where(eq(reviews.userId, userId));
    return rows.map((r) => r.productId);
  }
}

export function shortName(fullName: string) {
  const [first, ...rest] = fullName.trim().split(/\s+/);
  const last = rest.pop();
  return last ? `${first} ${last[0].toUpperCase()}.` : first;
}
