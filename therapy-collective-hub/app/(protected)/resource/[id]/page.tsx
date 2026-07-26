import { db } from '@/db';
import { resources, comments } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import ResourceDetailClient from './ResourceDetailClient';
import { notFound } from 'next/navigation';
import { ensureSchema } from '@/lib/ensure-schema';

export const dynamic = 'force-dynamic';

export default async function ResourceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  await ensureSchema();
  const resource = await db.query.resources.findFirst({
    where: eq(resources.id, id),
    with: {
      comments: {
        orderBy: [desc(comments.createdAt)],
      },
    },
  });

  // Trashed resources are only reachable via Restore on the library page
  if (!resource || resource.deletedAt) {
    notFound();
  }

  return <ResourceDetailClient initialResource={resource} />;
}
