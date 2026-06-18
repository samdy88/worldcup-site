import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || 'worldcup-bet-secret-2026'
);

const PUBLIC_PATHS = [
  '/login',
  '/api/auth/login',
  '/api/auth/register',
  '/disclaimer',
];

const CRON_SECRET = process.env.CRON_SECRET || 'cron-secret-2026';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static files and public paths
  if (
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico' ||
    PUBLIC_PATHS.some((p) => pathname === p)
  ) {
    return NextResponse.next();
  }

  // Cron endpoints: allow via Bearer token or internal (localhost)
  if (pathname.startsWith('/api/cron/')) {
    const authHeader = request.headers.get('authorization');
    const cronToken = request.nextUrl.searchParams.get('token');
    if (
      authHeader === `Bearer ${CRON_SECRET}` ||
      cronToken === CRON_SECRET
    ) {
      return NextResponse.next();
    }
    // Also allow localhost without auth (system cron)
    const xForwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const remoteAddr = request.headers.get('x-remote-addr');
    if (!xForwarded && !realIp && !remoteAddr) {
      // Direct localhost request (no reverse proxy headers)
      return NextResponse.next();
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Leaderboard and player public profile pages are public (read-only)
  if (
    pathname === '/api/leaderboard' ||
    pathname === '/leaderboard' ||
    pathname.startsWith('/players/') ||
    pathname.startsWith('/api/players/')
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get('token')?.value;

  if (!token) {
    // API routes return JSON error, pages redirect
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    await jwtVerify(token, SECRET);
    return NextResponse.next();
  } catch {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: '登录已过期' }, { status: 401 });
    }
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('token');
    return response;
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
