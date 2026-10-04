import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, avg, count, eq, or } from 'drizzle-orm';
import { db } from '../db/client';
import { productImages, products, reviews, stores, users } from '../db/schema';
import { CreateStoreDto, UpdateStoreDto } from './dto/store.dto';
import { ProductsService } from '../products/products.service';
import { presentPrice } from '../products/pricing';

function slugify(name: string) {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || `store-${Date.now()}`
  );
}

@Injectable()
export class StoresService {
  constructor(private readonly productsService: ProductsService) {}

  // Any signed-in account can open a store (like Daraz/AliExpress, a seller
  // can also buy). Opening one upgrades the account's role to SELLER.
  async create(ownerId: string, dto: CreateStoreDto) {
    const existing = await db.query.stores.findFirst({ where: eq(stores.ownerId, ownerId) });
    if (existing) throw new BadRequestException('You already have a store.');

    let slug = slugify(dto.name);
    const slugTaken = await db.query.stores.findFirst({ where: eq(stores.slug, slug) });
    if (slugTaken) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

    const [store] = await db.insert(stores).values({ ...dto, ownerId, slug }).returning();
    await db.update(users).set({ role: 'SELLER' }).where(and(eq(users.id, ownerId), eq(users.role, 'BUYER')));
    return store;
  }

  async myStore(ownerId: string) {
    const store = await db.query.stores.findFirst({ where: eq(stores.ownerId, ownerId) });
    if (!store) throw new NotFoundException('You have not created a store yet.');
    return store;
  }

  async update(ownerId: string, dto: UpdateStoreDto) {
    const store = await this.myStore(ownerId);
    const [updated] = await db.update(stores).set(dto).where(eq(stores.id, store.id)).returning();
    return updated;
  }

  async getPublic(idOrSlug: string) {
    const store = await db.query.stores.findFirst({
      where: or(eq(stores.id, idOrSlug), eq(stores.slug, idOrSlug)),
    });
    if (!store) throw new NotFoundException('Store not found.');

    const storeProducts = await db.query.products.findMany({
      where: and(eq(products.storeId, store.id), eq(products.isActive, true)),
      with: { images: { orderBy: asc(productImages.position) } },
    });
    const ids = storeProducts.map((p) => p.id);
    const [ratings, sold] = await Promise.all([
      this.productsService.ratingsFor(ids),
      this.productsService.soldCounts(ids),
    ]);

    const [ratingRow] = await db
      .select({ avgRating: avg(reviews.rating), reviewCount: count(reviews.id) })
      .from(reviews)
      .innerJoin(products, eq(reviews.productId, products.id))
      .where(eq(products.storeId, store.id));

    const { ownerId, ...publicStore } = store;
    const storeInfo = { id: store.id, name: store.name, slug: store.slug, verified: store.verified };
    return {
      ...publicStore,
      products: storeProducts.map((p) => ({
        ...presentPrice(p),
        store: storeInfo,
        avgRating: ratings.get(p.id)?.avgRating ?? null,
        reviewCount: ratings.get(p.id)?.reviewCount ?? 0,
        soldCount: sold.get(p.id) ?? 0,
      })),
      stats: {
        productCount: storeProducts.length,
        totalSold: [...sold.values()].reduce((a, b) => a + b, 0),
        avgRating: ratingRow?.avgRating ? Number(ratingRow.avgRating).toFixed(1) : null,
        reviewCount: Number(ratingRow?.reviewCount ?? 0),
      },
    };
  }
}
