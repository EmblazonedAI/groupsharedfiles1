import { NextResponse } from 'next/server';
import { db } from '@/db';
import { resources } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { ensureSchema } from '@/lib/ensure-schema';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        await ensureSchema();
        const { id } = await params;
        const [restored] = await db.update(resources)
            .set({ deletedAt: null })
            .where(eq(resources.id, id))
            .returning();
        if (!restored) {
            return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
        }
        return NextResponse.json(restored);
    } catch (error) {
        console.error('Error restoring resource:', error);
        return NextResponse.json({ error: 'Failed to restore resource' }, { status: 500 });
    }
}
