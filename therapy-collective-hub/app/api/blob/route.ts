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
    wav: 'audio/wav',
    m4a: 'audio/mp4',
    mp4: 'video/mp4',
    webm: 'video/webm',
    mov: 'video/quicktime',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    csv: 'text/csv',
};

const TYPE_EXTENSIONS: Record<string, string> = Object.fromEntries(
    Object.entries(EXTENSION_TYPES).map(([ext, type]) => [type, ext])
);

const resolveHeaders = (blobUrl: string, upstream: Response, download: boolean, nameOverride: string | null) => {
    let fileName = 'file';
    let extension = '';
    try {
        fileName = decodeURIComponent(new URL(blobUrl).pathname.split('/').pop() || 'file');
        const dot = fileName.lastIndexOf('.');
        extension = dot >= 0 ? fileName.slice(dot + 1).toLowerCase() : '';
    } catch { /* keep defaults */ }

    let contentType = upstream.headers.get('content-type') || 'application/octet-stream';
    // Blob storage sometimes reports octet-stream; fix it up from the file
    // extension so browsers render previews inline instead of downloading.
    if (contentType === 'application/octet-stream' && EXTENSION_TYPES[extension]) {
        contentType = EXTENSION_TYPES[extension];
    }

    // Older uploads have no real filename in the URL ("blob"), so callers can
    // pass a friendly name; add an extension from the content type if missing.
    if (nameOverride) {
        fileName = nameOverride;
        if (!/\.[A-Za-z0-9]{1,8}$/.test(fileName)) {
            const baseType = contentType.split(';')[0].trim();
            const ext = TYPE_EXTENSIONS[baseType];
            if (ext) fileName += `.${ext}`;
        }
    }

    const asciiName = fileName.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_');
    const disposition = download ? 'attachment' : 'inline';

    const headers: Record<string, string> = {
        'Content-Type': contentType,
        'Content-Disposition': `${disposition}; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        'Cache-Control': 'public, max-age=31536000, immutable',
    };
    const contentLength = upstream.headers.get('content-length');
    if (contentLength) headers['Content-Length'] = contentLength;
    return headers;
};

const proxyRequest = async (request: Request, method: 'GET' | 'HEAD') => {
    const { searchParams } = new URL(request.url);
    const blobUrl = searchParams.get('url');
    const download = searchParams.get('download') === '1';
    const nameOverride = searchParams.get('name');

    if (!blobUrl) {
        return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
    }

    // Only proxy our own blob storage: this route attaches the storage token
    // to the outgoing request, so an arbitrary URL would leak it (and allow
    // server-side request forgery).
    try {
        const host = new URL(blobUrl).hostname;
        if (!host.endsWith('.blob.vercel-storage.com')) {
            return NextResponse.json({ error: 'URL not allowed' }, { status: 400 });
        }
    } catch {
        return NextResponse.json({ error: 'Invalid url parameter' }, { status: 400 });
    }

    try {
        const response = await fetch(blobUrl, {
            method,
            headers: {
                Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`,
            },
        });

        if (!response.ok) {
            return NextResponse.json({ error: 'Failed to fetch file' }, { status: response.status });
        }

        const headers = resolveHeaders(blobUrl, response, download, nameOverride);
        return new NextResponse(method === 'HEAD' ? null : response.body, { status: 200, headers });
    } catch (error) {
        console.error('Error proxying blob:', error);
        return NextResponse.json({ error: 'Failed to proxy file' }, { status: 500 });
    }
};

export async function GET(request: Request) {
    return proxyRequest(request, 'GET');
}

export async function HEAD(request: Request) {
    return proxyRequest(request, 'HEAD');
}
