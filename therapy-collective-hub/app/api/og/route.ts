import { NextResponse } from 'next/server';
import { JSDOM } from 'jsdom';

const MAX_HTML_BYTES = 500_000;
const FETCH_TIMEOUT_MS = 8_000;

// This route fetches caller-supplied URLs server-side, so refuse anything
// that could reach internal infrastructure (localhost, private IP ranges).
const isPrivateHost = (hostname: string) => {
  const host = hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) {
    return true;
  }
  if (host.includes(':')) return true; // IPv6 literals — not needed for OG lookups
  const octets = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (octets) {
    const [a, b] = [Number(octets[1]), Number(octets[2])];
    if (a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)) {
      return true;
    }
  }
  return false;
};

export async function POST(request: Request) {
  try {
    const { url } = await request.json();
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'No URL provided' }, { status: 400 });
    }

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }
    if (!['http:', 'https:'].includes(parsed.protocol) || isPrivateHost(parsed.hostname)) {
      return NextResponse.json({ error: 'URL not allowed' }, { status: 400 });
    }

    const response = await fetch(parsed.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TherapyCollectiveBot/1.0)',
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      return NextResponse.json({ title: null, description: null, image: null });
    }

    const html = (await response.text()).slice(0, MAX_HTML_BYTES);
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const getMetaContent = (name: string, property: string) => {
      const meta = doc.querySelector(`meta[name="${name}"], meta[property="${property}"]`);
      return meta ? meta.getAttribute('content') : null;
    };

    const title = getMetaContent('title', 'og:title') || doc.title;
    const description = getMetaContent('description', 'og:description');
    const image = getMetaContent('', 'og:image') || getMetaContent('twitter:image', 'twitter:image');

    return NextResponse.json({ title, description, image });
  } catch (error) {
    console.error('Error fetching OG data:', error);
    return NextResponse.json({ error: 'Failed to fetch OG data' }, { status: 500 });
  }
}
