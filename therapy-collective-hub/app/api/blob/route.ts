import { NextResponse } from 'next/server';

const EXTENSION_TYPES: Record<string, string> = {
    pdf: 'application/pdf',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    txt: 'text/plain',
    mp3: 'audio/mpeg',
    mp4: 'video/mp4',
};

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const blobUrl = searchParams.get('url');
    const download = searchParams.get('download') === '1';

    if (!blobUrl) {
        return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
    }

    try {
        const response = await fetch(blobUrl, {
            headers: {
                Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`,
            },
        });

        if (!response.ok) {
            return NextResponse.json({ error: 'Failed to fetch file' }, { status: response.status });
        }

        let fileName = 'file';
        let extension = '';
        try {
            fileName = decodeURIComponent(new URL(blobUrl).pathname.split('/').pop() || 'file');
            const dot = fileName.lastIndexOf('.');
            extension = dot >= 0 ? fileName.slice(dot + 1).toLowerCase() : '';
        } catch { /* keep defaults */ }

        let contentType = response.headers.get('content-type') || 'application/octet-stream';
        // Blob storage sometimes reports octet-stream; fix it up from the file
        // extension so browsers render previews inline instead of downloading.
        if (contentType === 'application/octet-stream' && EXTENSION_TYPES[extension]) {
            contentType = EXTENSION_TYPES[extension];
        }

        const asciiName = fileName.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_');
        const disposition = download ? 'attachment' : 'inline';

        const headers: Record<string, string> = {
            'Content-Type': contentType,
            'Content-Disposition': `${disposition}; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
            'Cache-Control': 'public, max-age=31536000, immutable',
        };

        return new NextResponse(response.body, { status: 200, headers });
    } catch (error) {
        console.error('Error proxying blob:', error);
        return NextResponse.json({ error: 'Failed to proxy file' }, { status: 500 });
    }
}
