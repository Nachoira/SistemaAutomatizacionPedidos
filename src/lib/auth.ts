import { cookies } from 'next/headers';

// Sesión de admin simple, compatible con Edge Runtime y Node.js
const SESSION_COOKIE_NAME = 'bar_admin_session';
const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7; // 7 días

function getSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    throw new Error('Falta ADMIN_SESSION_SECRET en las variables de entorno');
  }
  return secret;
}

// Conversión segura para bytes / hex en Edge y Node
function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function sign(value: string): Promise<string> {
  const secret = getSecret();
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    enc.encode(value)
  );
  return bufferToHex(signature);
}

// Comparación segura contra ataques de tiempo (timingSafeEqual equivalente)
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export async function createSessionToken(): Promise<string> {
  const payload = `admin:${Date.now()}`;
  const signature = await sign(payload);
  const combined = `${payload}.${signature}`;
  return btoa(combined);
}

export async function isValidSessionToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  try {
    const decoded = atob(token);
    const [payload, signature] = decoded.split('.');
    if (!payload || !signature) return false;

    const expected = await sign(payload);
    if (!safeEqual(signature, expected)) return false;

    const timestamp = Number(payload.split(':')[1]);
    if (!timestamp || Date.now() - timestamp > SESSION_MAX_AGE_MS) return false;

    return true;
  } catch {
    return false;
  }
}

// Para usar dentro de API routes (Server Components / route handlers).
export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  return await isValidSessionToken(token);
}

export { SESSION_COOKIE_NAME };