import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyJWT } from '@/lib/auth';

export async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // 1. Define guarded paths
    // Exclude static files, images, api/auth routes (except protected ones if any), etc.
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/static') ||
        pathname.endsWith('.ico') ||
        pathname.endsWith('.png') ||
        pathname.endsWith('.svg')
    ) {
        return NextResponse.next();
    }

    // Public auth API routes should be accessible always, but pages should redirect if logged in
    const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/signup');
    const isApiAuthRoute = pathname.startsWith('/api/auth');

    // Verify token
    const token = req.cookies.get('token')?.value;
    let isAuthenticated = false;

    if (token) {
        const payload = await verifyJWT(token);
        if (payload) {
            isAuthenticated = true;
        }
    }

    // 2. Redirect logic
    if (isAuthPage && isAuthenticated) {
        // If logged in and trying to go to login/signup, redirect to dashboard
        return NextResponse.redirect(new URL('/', req.url));
    }

    if (!isAuthenticated && !isAuthPage && !isApiAuthRoute) {
        // If not logged in and trying to access protected route (dashboard, add-task, protected APIs)
        // Redirect to login
        // For API calls, maybe return 401 instead of redirect? For now, redirect is safe for pages.
        if (pathname.startsWith('/api')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.redirect(new URL('/login', req.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
