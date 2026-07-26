import { db } from '@/db';
import { categories, resources } from '@/db/schema';
import { asc, desc, isNull } from 'drizzle-orm';
import { ensureSchema } from '@/lib/ensure-schema';
import CategoriesClient from './CategoriesClient';

export const dynamic = 'force-dynamic';

export default async function CategoriesPage() {
  await ensureSchema();
  const [dbCategories, allResources] = await Promise.all([
    db.select().from(categories).orderBy(asc(categories.name)),
    db.query.resources.findMany({ where: isNull(resources.deletedAt), orderBy: [desc(resources.addedAt)] }),
  ]);

  // Union of the official category list and any labels still on resources,
  // so nothing becomes invisible after a category is deleted or renamed.
  const names = new Set<string>(
    dbCategories.map((c) => c.name).filter((n) => n !== '__MIGRATED__')
  );
  for (const r of allResources) {
    if (r.category) names.add(r.category);
  }

  const grouped = [...names].sort((a, b) => a.localeCompare(b)).map((name) => ({
    name,
    resources: allResources
      .filter((r) => r.category === name)
      .map((r) => ({
        id: r.id,
        title: r.title,
        likeCount: r.likeCount,
        loveCount: r.loveCount,
      })),
  }));

  return <CategoriesClient initialCategories={grouped} />;
}
