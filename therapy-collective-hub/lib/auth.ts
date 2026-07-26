import { jwtVerify, SignJWT } from 'jose';

// Tokens are signed with AUTH_SECRET when set (recommended: a long random
// string in the Vercel env vars), falling back to the shared password so
// nothing breaks if AUTH_SECRET isn't configured. Verification tries every
// candidate so adding AUTH_SECRET later doesn't log existing sessions out.
const encode = (key: string) => new TextEncoder().encode(key);

const signingKey = () =>
  process.env.AUTH_SECRET || process.env.SHARED_PASSWORD || 'default-secret-do-not-use-in-prod';

const verificationKeys = () => {
  const keys = [
    process.env.AUTH_SECRET,
    process.env.SHARED_PASSWORD || 'default-secret-do-not-use-in-prod',
    process.env.SHARED_PASSWORD_2,
  ].filter((k): k is string => !!k);
  return [...new Set(keys)];
};

export async function signToken(payload: any) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(encode(signingKey()));
}

export async function verifyToken(token: string) {
  for (const key of verificationKeys()) {
    try {
      const { payload } = await jwtVerify(token, encode(key));
      return payload;
    } catch {
      // try the next candidate key
    }
  }
  return null;
}
