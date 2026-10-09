import { NextResponse, type NextRequest } from 'next/server'
import { isEnPublicSegment, toInternal } from '@/lib/routes'

// Hrvatski je na "/", engleski na "/en". Javni (lokalizirani) URL-ovi prepisuju se na app/[locale]/...
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (pathname === '/hr' || pathname.startsWith('/hr/')) {
    const url = req.nextUrl.clone()
    url.pathname = pathname.slice(3) || '/'
    return NextResponse.redirect(url, 308)
  }
  const parts = pathname.split('/').filter(Boolean)
  if (parts.length > 0 && parts[0] !== 'en' && isEnPublicSegment(parts[0])) {
    const url = req.nextUrl.clone()
    url.pathname = `/en/${parts.join('/')}`
    return NextResponse.redirect(url, 308)
  }
  const url = req.nextUrl.clone()
  url.pathname = toInternal(pathname)
  return NextResponse.rewrite(url)
}

export const config = {
  matcher: ['/((?!api|admin|staff|_next|.*\\..*).*)'],
}
