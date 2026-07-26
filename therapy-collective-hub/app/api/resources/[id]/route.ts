import { NextResponse } from 'next/server';
import { db } from '@/db';
import { resources, comments } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const data = await request.json();

        const updateData: any = {};
        if (data.title !== undefined) updateData.title = data.title;
        if (data.url !== undefined) updateData.url = data.url || null;
        if (data.description !== undefined) updateData.description = data.description || null;
        if (data.tags !== undefined) updateData.tags = data.tags;
        if (data.category !== undefined) updateData.category = data.category;
        if (data.format !== undefined) updateData.format = data.format;
        if (data.addedBy !== undefined) updateData.addedBy = data.addedBy || null;
        if (data.notes !== undefined) updateData.notes = data.notes || null;
        if (data.blobUrl !== undefined) updateData.blobUrl = data.blobUrl; // Can be null to remove

        const [updated] = await db.update(resources)
            .set(updateData)
            .where(eq(resources.id, id))
            .returning();

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Error updating resource:', error);
        return NextResponse.json({ error: 'Failed to update resource' }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        // Comments cascade delete via schema, but let's be explicit
        await db.delete(comments).where(eq(comments.resourceId, id));
        await db.delete(resources).where(eq(resources.id, id));
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting resource:', error);
        return NextResponse.json({ error: 'Failed to delete resource' }, { status: 500 });
    }
}
