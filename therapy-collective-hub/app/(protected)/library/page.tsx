import { db } from '@/db';
import { resources } from '@/db/schema';
import { desc, isNull, isNotNull } from 'drizzle-orm';
import { ensureSchema } from '@/lib/ensure-schema';
import { runMaintenance } from '@/lib/maintenance';
import LibraryClient from './LibraryClient';

export const dynamic = 'force-dynamic';

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; tag?: string; deleted?: string }>;
}) {
  const { category, tag, deleted } = await searchParams;

  await ensureSchema();
  runMaintenance(); // fire-and-forget trash purge + orphaned file sweep

  const [allResources, trashedResources] = await Promise.all([
    db.query.resources.findMany({
      where: isNull(resources.deletedAt),
      with: { comments: true },
      orderBy: [desc(resources.addedAt)],
    }),
    db.query.resources.findMany({
      where: isNotNull(resources.deletedAt),
      orderBy: [desc(resources.deletedAt)],
    }),
  ]);

  return (
    <LibraryClient
      initialResources={allResources}
      initialCategory={category || null}
      initialTag={tag || null}
      justDeletedId={deleted || null}
      trashedResources={trashedResources}
    />
  );
}
