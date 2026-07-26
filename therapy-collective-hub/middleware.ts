import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from './lib/auth';

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  const { pathname } = request.nextUrl;

  // Allow static assets always
  if (pathname.startsWith('/_next') || pathname.includes('.')) {
    return NextResponse.next();
  }

  // Allow public API routes (auth endpoints only)
  if (pathname === '/api/auth/login' || pathname === '/api/auth/logout') {
    return NextResponse.next();
  }

  const payload = token ? await verifyToken(token) : null;

  // Root path: redirect to library if authenticated, login if not
  if (pathname === '/') {
    if (payload) {
      return NextResponse.redirect(new URL('/library', request.url));
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Login page: redirect to library if already authenticated
  if (pathname === '/login') {
    if (payload) {
      return NextResponse.redirect(new URL('/library', request.url));
    }
    return NextResponse.next();
  }

  // All other routes: require authentication
  if (!payload) {
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
