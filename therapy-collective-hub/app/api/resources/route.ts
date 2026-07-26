import { NextResponse } from 'next/server';
import { db } from '@/db';
import { resources } from '@/db/schema';
import { ensureSchema } from '@/lib/ensure-schema';
import { resourceInputSchema, firstIssue } from '@/lib/validation';

export async function POST(request: Request) {
  try {
    await ensureSchema();
    const parsed = resourceInputSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });
    }
    const data = parsed.data;

    const [newResource] = await db.insert(resources).values({
      title: data.title,
      url: data.url || null,
      blobUrl: data.blobUrl || null,
      ogImage: data.ogImage || null,
      description: data.description || null,
      tags: data.tags || [],
      category: data.category,
      format: data.format,
      addedBy: data.addedBy || null,
      notes: data.notes || null,
    }).returning();

    return NextResponse.json(newResource);
  } catch (error) {
    console.error('Error creating resource:', error);
    return NextResponse.json({ error: 'Failed to create resource' }, { status: 500 });
  }
}
