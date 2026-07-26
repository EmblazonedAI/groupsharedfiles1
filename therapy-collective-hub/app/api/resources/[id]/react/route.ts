import { NextResponse } from 'next/server';
import { db } from '@/db';
import { resources } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { ensureSchema } from '@/lib/ensure-schema';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensureSchema();
    const { id } = await params;
    const { type, action } = await request.json();

    if (type !== 'like' && type !== 'love') {
      return NextResponse.json({ error: 'Invalid reaction type' }, { status: 400 });
    }

    const field = type === 'like' ? resources.likeCount : resources.loveCount;
    const columnName = type === 'like' ? 'likeCount' : 'loveCount';

    const [updatedResource] = await db.update(resources)
      .set({
        [columnName]: action === 'subtract'
          ? sql`GREATEST(${field} - 1, 0)`
          : sql`${field} + 1`,
      })
      .where(eq(resources.id, id))
      .returning();

    return NextResponse.json({
      likeCount: updatedResource.likeCount,
      loveCount: updatedResource.loveCount,
    });
  } catch (error) {
    console.error('Error reacting:', error);
    return NextResponse.json({ error: 'Failed to react' }, { status: 500 });
  }
}
