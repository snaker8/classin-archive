import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    // API admin 라우트 보호 (API 자체에서도 인증하지만 이중 보호)
    if (pathname.startsWith('/api/admin/')) {
        const token = request.cookies.get('sb-access-token')?.value
        if (!token) {
            return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
        }
    }

    // Admin 페이지 보호
    if (pathname.startsWith('/admin')) {
        const token = request.cookies.get('sb-access-token')?.value
        if (!token) {
            return NextResponse.redirect(new URL('/login', request.url))
        }
    }

    // Teacher 페이지 보호
    if (pathname.startsWith('/teacher')) {
        const token = request.cookies.get('sb-access-token')?.value
        if (!token) {
            return NextResponse.redirect(new URL('/login', request.url))
        }
    }

    // Student 페이지 보호
    if (pathname.startsWith('/student')) {
        const token = request.cookies.get('sb-access-token')?.value
        if (!token) {
            return NextResponse.redirect(new URL('/login', request.url))
        }
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        '/admin/:path*',
        '/teacher/:path*',
        '/student/:path*',
        '/api/admin/:path*',
    ]
}
