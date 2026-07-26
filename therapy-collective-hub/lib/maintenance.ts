import { db } from '@/db';
import { resources, comments } from '@/db/schema';
import { and, eq, isNotNull, lt } from 'drizzle-orm';
import { del, list } from '@vercel/blob';

const TRASH_RETENTION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const ORPHAN_MIN_AGE_MS = 24 * 60 * 60 * 1000; // never touch blobs younger than a day
const RUN_INTERVAL_MS = 6 * 60 * 60 * 1000;

let lastRun = 0;

/**
 * Opportunistic background housekeeping, kicked off (fire-and-forget) from
 * the library page. Purges resources that sat in the trash past retention
 * (including their stored files and comments) and sweeps storage blobs no
 * resource references anymore — e.g. files replaced via the edit form long
 * before replacement started cleaning up after itself.
 */
export function runMaintenance() {
  const now = Date.now();
  if (now - lastRun < RUN_INTERVAL_MS) return;
  lastRun = now;

  (async () => {
    // 1. Purge expired trash
    const cutoff = new Date(now - TRASH_RETENTION_MS);
    const expired = await db
      .select({ id: resources.id, blobUrl: resources.blobUrl })
      .from(resources)
      .where(and(isNotNull(resources.deletedAt), lt(resources.deletedAt, cutoff)));

    for (const r of expired) {
      if (r.blobUrl) {
        try { await del(r.blobUrl); } catch (err) { console.error('blob purge failed', err); }
      }
      await db.delete(comments).where(eq(comments.resourceId, r.id));
      await db.delete(resources).where(eq(resources.id, r.id));
    }

    // 2. Sweep orphaned blobs (not referenced by any resource, trashed or live)
    const rows = await db.select({ blobUrl: resources.blobUrl }).from(resources);
    const referenced = new Set(rows.map((r) => r.blobUrl).filter(Boolean));

    let cursor: string | undefined;
    do {
      const page = await list({ cursor, limit: 100 });
      for (const blob of page.blobs) {
        const oldEnough = now - new Date(blob.uploadedAt).getTime() > ORPHAN_MIN_AGE_MS;
        if (oldEnough && !referenced.has(blob.url)) {
          try { await del(blob.url); } catch (err) { console.error('orphan sweep failed', err); }
        }
      }
      cursor = page.cursor;
    } while (cursor);
  })().catch((err) => console.error('maintenance run failed', err));
}
