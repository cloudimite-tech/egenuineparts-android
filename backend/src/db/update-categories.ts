// Non-destructive: installs the current CATEGORY_TREE, moves existing
// products into the new categories, and removes old categories.
// Users, stores, orders, chats and reviews are untouched.
//   npm run db:categories
import 'dotenv/config';
import { eq, inArray, notInArray } from 'drizzle-orm';
import { db, queryClient } from './client';
import { categories, products } from './schema';
import { CATEGORY_TREE, LEGACY_CATEGORY_MAP } from './category-tree';

async function main() {
  const existing = await db.select().from(categories);
  const bySlug = new Map(existing.map((c) => [c.slug, c]));
  const keep = new Set<string>();

  const upsert = async (name: string, slug: string, icon: string, parentId: string | null) => {
    const found = bySlug.get(slug);
    if (found) {
      await db.update(categories).set({ name, icon, parentId }).where(eq(categories.id, found.id));
      keep.add(found.id);
      return found.id;
    }
    const [row] = await db.insert(categories).values({ name, slug, icon, parentId }).returning();
    keep.add(row.id);
    return row.id;
  };

  const newIdBySlug = new Map<string, string>();
  for (const parent of CATEGORY_TREE) {
    const pid = await upsert(parent.name, parent.slug, parent.icon, null);
    newIdBySlug.set(parent.slug, pid);
    for (const child of parent.children) {
      newIdBySlug.set(child.slug, await upsert(child.name, child.slug, parent.icon, pid));
    }
  }

  // Re-home products sitting in categories that are going away.
  const stale = existing.filter((c) => !keep.has(c.id));
  let moved = 0;
  for (const c of stale) {
    const target = newIdBySlug.get(LEGACY_CATEGORY_MAP[c.slug] ?? '') ?? null;
    const res = await db
      .update(products)
      .set({ categoryId: target })
      .where(eq(products.categoryId, c.id))
      .returning({ id: products.id });
    moved += res.length;
  }
  if (stale.length) {
    // children first, then parents
    const staleIds = stale.map((c) => c.id);
    await db.update(categories).set({ parentId: null }).where(inArray(categories.id, staleIds));
    await db.delete(categories).where(inArray(categories.id, staleIds));
  }
  const total = await db.select().from(categories).where(notInArray(categories.id, ['__none__']));
  console.log(`Categories now: ${total.length}. Removed ${stale.length} old ones, moved ${moved} products.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => queryClient.end());
