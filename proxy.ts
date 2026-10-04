import { NextResponse, type NextRequest } from 'next/server'
import { toInternal } from '@/lib/routes'

// Hrvatski je na "/", engleski na "/en". Javni (lokalizirani) URL-ovi prepisuju se na app/[locale]/...
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (pathname === '/hr' || pathname.startsWith('/hr/')) {
    const url = req.nextUrl.clone()
    url.pathname = pathname.slice(3) || '/'
    return NextResponse.redirect(url, 308)
  }
  const url = req.nextUrl.clone()
  url.pathname = toInternal(pathname)
  return NextResponse.rewrite(url)
}

export const config = {
  matcher: ['/((?!api|admin|_next|.*\\..*).*)'],
}
