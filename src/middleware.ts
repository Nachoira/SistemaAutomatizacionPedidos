import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isValidSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';

// Protege todas las páginas /admin/* excepto /admin/login. Esto es
// defensa de UI (redirige al login); las API routes que tocan datos
// sensibles (products POST/PATCH, customers, orders GET/PATCH) tienen
// su propio chequeo con isAdminAuthenticated(), porque el matcher de
// acá no cubre /api/*.
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith('/admin/login')) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  
  // Como ahora validamos criptografía Web nativa de forma asíncrona:
  const isValid = await isValidSessionToken(token);
  if (!isValid) {
    return NextResponse.redirect(new URL('/admin/login', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};