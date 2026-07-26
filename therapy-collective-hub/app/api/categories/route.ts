import { NextResponse } from 'next/server';
import { db } from '@/db';
import { categories, resources } from '@/db/schema';
import { asc, eq } from 'drizzle-orm';
import { CATEGORIES } from '@/lib/config';
import { categoryNameSchema, firstIssue } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const dbCategories = await db.select().from(categories).orderBy(asc(categories.name));
        const dbNames = dbCategories.map(c => c.name);

        if (!dbNames.includes('__MIGRATED__')) {
            // Unmigrated state: Insert missing defaults
            const missingDefaults = CATEGORIES.filter(c => !dbNames.includes(c));
            if (missingDefaults.length > 0) {
                await db.insert(categories).values(missingDefaults.map(name => ({ name }))).onConflictDoNothing();
            }
            // Insert the flag
            await db.insert(categories).values({ name: '__MIGRATED__' }).onConflictDoNothing();

            const finalCategories = await db.select().from(categories).orderBy(asc(categories.name));
            return NextResponse.json(finalCategories.filter(c => c.name !== '__MIGRATED__').map(c => c.name));
        }

        return NextResponse.json(dbNames.filter(name => name !== '__MIGRATED__'));
    } catch (error) {
        console.error('Error fetching categories:', error);
        return NextResponse.json(CATEGORIES);
    }
}

export async function POST(request: Request) {
    try {
        const { name } = await request.json();
        const parsed = categoryNameSchema.safeParse(name);
        if (!parsed.success) {
            return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });
        }
        const [created] = await db.insert(categories).values({
            name: parsed.data,
        }).onConflictDoNothing().returning();

        return NextResponse.json(created || { name: parsed.data, existing: true });
    } catch (error) {
        console.error('Error creating category:', error);
        return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const name = searchParams.get('name');
        if (!name) {
            return NextResponse.json({ error: 'Category name required' }, { status: 400 });
        }
        await db.delete(categories).where(eq(categories.name, name));
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting category:', error);
        return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const { oldName, newName } = await request.json();
        const parsedOld = categoryNameSchema.safeParse(oldName);
        const parsedNew = categoryNameSchema.safeParse(newName);
        if (!parsedOld.success || !parsedNew.success) {
            return NextResponse.json({ error: 'Both old and new names are required (max 100 characters)' }, { status: 400 });
        }

        // Update category in categories table (if it exists there)
        await db.update(categories)
            .set({ name: parsedNew.data })
            .where(eq(categories.name, parsedOld.data));

        // Update all resources that reference the old category name
        await db.update(resources)
            .set({ category: parsedNew.data })
            .where(eq(resources.category, parsedOld.data));

        return NextResponse.json({ success: true, name: parsedNew.data });
    } catch (error) {
        console.error('Error renaming category:', error);
        return NextResponse.json({ error: 'Failed to rename category' }, { status: 500 });
    }
}
