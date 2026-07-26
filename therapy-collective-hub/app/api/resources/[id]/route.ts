import { NextResponse } from 'next/server';
import { db } from '@/db';
import { resources } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { del } from '@vercel/blob';
import { ensureSchema } from '@/lib/ensure-schema';
import { resourceUpdateSchema, firstIssue } from '@/lib/validation';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        await ensureSchema();
        const { id } = await params;
        const parsed = resourceUpdateSchema.safeParse(await request.json());
        if (!parsed.success) {
            return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });
        }
        const data = parsed.data;

        const [existing] = await db.select().from(resources).where(eq(resources.id, id));
        if (!existing) {
            return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
        }

        const updateData: any = {};
        if (data.title !== undefined) updateData.title = data.title;
        if (data.url !== undefined) updateData.url = data.url || null;
        if (data.description !== undefined) updateData.description = data.description || null;
        if (data.tags !== undefined) updateData.tags = data.tags;
        if (data.category !== undefined) updateData.category = data.category;
        if (data.format !== undefined) updateData.format = data.format;
        if (data.addedBy !== undefined) updateData.addedBy = data.addedBy || null;
        if (data.notes !== undefined) updateData.notes = data.notes || null;
        if (data.blobUrl !== undefined) updateData.blobUrl = data.blobUrl || null; // null removes the file

        const [updated] = await db.update(resources)
            .set(updateData)
            .where(eq(resources.id, id))
            .returning();

        // The old file is unreferenced once replaced or removed — free the storage
        if (data.blobUrl !== undefined && existing.blobUrl && existing.blobUrl !== updateData.blobUrl) {
            try { await del(existing.blobUrl); } catch (err) { console.error('old blob cleanup failed', err); }
        }

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Error updating resource:', error);
        return NextResponse.json({ error: 'Failed to update resource' }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        await ensureSchema();
        const { id } = await params;
        // Soft delete: the resource sits in "Recently deleted" for 30 days
        // (comments and file intact) before maintenance purges it for real.
        await db.update(resources)
            .set({ deletedAt: new Date() })
            .where(eq(resources.id, id));
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting resource:', error);
        return NextResponse.json({ error: 'Failed to delete resource' }, { status: 500 });
    }
}
