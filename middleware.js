import { NextResponse } from 'next/server';

export function middleware(req) {
  // Puedes agregar logs o lógica pública aquí si lo necesitas
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/profile/:path*', '/settings/:path*', '/dashboard/admin/:path*'],
};
