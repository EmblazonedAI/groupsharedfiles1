import { NextResponse } from 'next/server';
import { signToken } from '@/lib/auth';

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 60 * 1000;
const WINDOW_MS = 10 * 60 * 1000;

// Per-instance failed-attempt tracker: 5 wrong guesses within 10 minutes
// locks that address out for a minute. In-memory is fine at this scale —
// each serverless instance enforces it independently.
const attempts = new Map<string, { count: number; windowStart: number; blockedUntil: number }>();

const getClientKey = (request: Request) =>
  request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';

export async function POST(request: Request) {
  const key = getClientKey(request);
  const now = Date.now();
  const record = attempts.get(key);

  if (record && record.blockedUntil > now) {
    const wait = Math.ceil((record.blockedUntil - now) / 1000);
    return NextResponse.json(
      { error: `Too many attempts. Please wait ${wait} second${wait === 1 ? '' : 's'} and try again.` },
      { status: 429 }
    );
  }

  const { password } = await request.json();
  const sharedPassword1 = process.env.SHARED_PASSWORD || 'default-secret-do-not-use-in-prod';
  const sharedPassword2 = process.env.SHARED_PASSWORD_2;

  // Accept password if it matches either shared password
  const isValid =
    typeof password === 'string' &&
    (password === sharedPassword1 || (sharedPassword2 && password === sharedPassword2));

  if (isValid) {
    attempts.delete(key);
    const token = await signToken({ authenticated: true });
    const response = NextResponse.json({ success: true });
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
    return response;
  }

  const fresh = !record || now - record.windowStart > WINDOW_MS;
  const next = {
    count: fresh ? 1 : record.count + 1,
    windowStart: fresh ? now : record.windowStart,
    blockedUntil: 0,
  };
  if (next.count >= MAX_ATTEMPTS) {
    next.blockedUntil = now + LOCKOUT_MS;
    next.count = 0;
    next.windowStart = now;
  }
  attempts.set(key, next);

  if (next.blockedUntil) {
    return NextResponse.json(
      { error: 'Too many attempts. Please wait a minute and try again.' },
      { status: 429 }
    );
  }
  return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
}
