import { NextResponse } from 'next/server';
import { Readable } from 'node:stream';
import JSZip from 'jszip';
import { db } from '@/db';
import { resources } from '@/db/schema';
import { desc, isNull } from 'drizzle-orm';
import { ensureSchema } from '@/lib/ensure-schema';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const sanitizeFileName = (name: string) =>
  name.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim().slice(0, 120) || 'file';

const extensionFromUrl = (url: string) => {
  try {
    const path = new URL(url).pathname;
    const dot = path.lastIndexOf('.');
    return dot >= 0 ? path.slice(dot + 1).toLowerCase() : '';
  } catch {
    return '';
  }
};

const TYPE_EXTENSIONS: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'video/mp4': 'mp4',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'text/plain': 'txt',
  'text/csv': 'csv',
};

const csvEscape = (value: unknown) => {
  const s = value == null ? '' : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function GET() {
  try {
    await ensureSchema();
    const all = await db.query.resources.findMany({
      where: isNull(resources.deletedAt),
      orderBy: [desc(resources.addedAt)],
    });

    const zip = new JSZip();

    const index = all.map((r) => ({
      title: r.title,
      category: r.category,
      format: r.format,
      tags: r.tags || [],
      link: r.url || '',
      hasFile: !!r.blobUrl,
      sharedBy: r.addedBy || 'Anonymous',
      addedOn: r.addedAt,
      description: r.description || '',
      notes: r.notes || '',
    }));

    zip.file('library.json', JSON.stringify(index, null, 2));
    const csvHeader = 'Title,Category,Format,Tags,Link,Has File,Shared By,Added On,Description';
    const csvRows = index.map((r) =>
      [r.title, r.category, r.format, r.tags.join('; '), r.link, r.hasFile ? 'yes' : 'no', r.sharedBy, r.addedOn, r.description]
        .map(csvEscape)
        .join(',')
    );
    zip.file('library.csv', [csvHeader, ...csvRows].join('\r\n'));

    const filesFolder = zip.folder('files')!;
    const usedNames = new Set<string>();

    for (const r of all) {
      if (!r.blobUrl) continue;
      try {
        const res = await fetch(r.blobUrl, {
          headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
        });
        if (!res.ok) continue;

        const contentType = (res.headers.get('content-type') || '').split(';')[0].trim();
        const ext = extensionFromUrl(r.blobUrl) || TYPE_EXTENSIONS[contentType] || 'bin';
        let name = `${sanitizeFileName(r.title)}.${ext}`;
        for (let i = 2; usedNames.has(name.toLowerCase()); i++) {
          name = `${sanitizeFileName(r.title)} (${i}).${ext}`;
        }
        usedNames.add(name.toLowerCase());
        filesFolder.file(name, Buffer.from(await res.arrayBuffer()));
      } catch (err) {
        console.error(`export: skipping file for "${r.title}"`, err);
      }
    }

    const nodeStream = zip.generateNodeStream({
      type: 'nodebuffer',
      streamFiles: true,
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });
    const webStream = Readable.toWeb(nodeStream as unknown as Readable) as ReadableStream;

    const date = new Date().toISOString().slice(0, 10);
    return new NextResponse(webStream, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="therapy-hub-backup-${date}.zip"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Export failed:', error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
