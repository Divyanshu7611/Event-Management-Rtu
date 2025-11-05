import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from './lib/auth';
import { Console } from 'console';
import Jwt from 'jsonwebtoken';

export function middleware(request: NextRequest) {
  // Get the pathname
  const path = request.nextUrl.pathname;

  // Define protected routes
  const isAdminRoute = path.startsWith('/admin');
  const isTeacherRoute = path.startsWith('/teacher');

  // Get the token from cookies
  const token = request.cookies.get('auth-token')?.value;

  if (isAdminRoute) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    try {
      const decoded = Jwt.decode(token);
      if (!decoded || (typeof decoded !== 'object' || decoded.role !== 'admin')) {
        return NextResponse.redirect(new URL('/login', request.url));
      }
    } catch (error) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  if (isTeacherRoute) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    try {
      const decoded = Jwt.decode(token);
      if (!decoded || (typeof decoded !== 'object' || (decoded.role !== 'teacher' && decoded.role !== 'admin'))) {
        return NextResponse.redirect(new URL('/login', request.url));
      }
    } catch (error) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/teacher/:path*'],
};