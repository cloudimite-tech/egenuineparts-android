import { Injectable } from '@nestjs/common';
import { count, eq } from 'drizzle-orm';
import { db } from '../db/client';
import { categories, products } from '../db/schema';
import { CATEGORY_TREE, CATEGORY_ORDER } from '../db/category-tree';

@Injectable()
export class CategoriesService {
  async listTree() {
    const all = await db.query.categories.findMany();
    const counts = await db
      .select({ categoryId: products.categoryId, n: count(products.id) })
      .from(products)
      .where(eq(products.isActive, true))
      .groupBy(products.categoryId);
    const direct = new Map(counts.map((c) => [c.categoryId, Number(c.n)]));

    const byParent = new Map<string | null, typeof all>();
    for (const cat of all) {
      const key = cat.parentId ?? null;
      if (!byParent.has(key)) byParent.set(key, []);
      byParent.get(key)!.push(cat);
    }

    // Children keep the order defined in the category tree (matches the catalogue).
    const childOrder = new Map<string, number>();
    CATEGORY_TREE.forEach((p) => p.children.forEach((c, i) => childOrder.set(c.slug, i)));
    const rank = (slug: string, isTop: boolean) => {
      const i = isTop ? CATEGORY_ORDER.indexOf(slug) : childOrder.get(slug) ?? -1;
      return i === -1 ? 999 : i;
    };

    type Node = (typeof all)[number] & { productCount: number; children: Node[] };
    const build = (parentId: string | null): Node[] =>
      (byParent.get(parentId) ?? [])
        .map((c) => {
          const children = build(c.id);
          const productCount =
            (direct.get(c.id) ?? 0) + children.reduce((sum, child) => sum + child.productCount, 0);
          return { ...c, productCount, children };
        })
        .sort((a, b) => rank(a.slug, parentId === null) - rank(b.slug, parentId === null) || a.name.localeCompare(b.name));

    return build(null);
  }
}
