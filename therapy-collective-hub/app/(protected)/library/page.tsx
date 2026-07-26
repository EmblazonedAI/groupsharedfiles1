import { db } from '@/db';
import { resources } from '@/db/schema';
import { desc } from 'drizzle-orm';
import LibraryClient from './LibraryClient';

export const dynamic = 'force-dynamic';

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;

  const allResources = await db.query.resources.findMany({
    with: {
      comments: true,
    },
    orderBy: [desc(resources.addedAt)],
  });

  return <LibraryClient initialResources={allResources} initialCategory={category || null} />;
}
