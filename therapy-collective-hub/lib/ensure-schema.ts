import { db } from '@/db';
import { sql } from 'drizzle-orm';

// The deployed database predates the deleted_at column and there is no
// migration pipeline wired to production, so every entry point that reads
// the resources table awaits this idempotent, once-per-instance ALTER.
let ensured: Promise<void> | null = null;

export function ensureSchema(): Promise<void> {
  if (!ensured) {
    ensured = db
      .execute(sql`ALTER TABLE resources ADD COLUMN IF NOT EXISTS deleted_at timestamp`)
      .then(() => undefined)
      .catch((err) => {
        ensured = null; // allow retry on the next request
        throw err;
      });
  }
  return ensured;
}
