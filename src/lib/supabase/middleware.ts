import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { DEMO_MODE, DEMO_ROLE_COOKIE } from '@/lib/demo'

/** Rotas acessiveis sem sessao. */
const PUBLIC_PATHS = ['/login', '/auth', '/recuperar-senha']

export async function updateSession(request: NextRequest) {
  const { pathname: path } = request.nextUrl
  const publicPath = PUBLIC_PATHS.some((p) => path.startsWith(p))

  // No modo demonstracao a sessao e um cookie simples: sem Supabase Auth,
  // o middleware so verifica a presenca do papel.
  if (DEMO_MODE) {
    const hasRole = Boolean(request.cookies.get(DEMO_ROLE_COOKIE)?.value)
    if (!hasRole && !publicPath) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('next', path)
      return NextResponse.redirect(url)
    }
    if (hasRole && path === '/login') {
      const url = request.nextUrl.clone()
      url.pathname = '/hoje'
      url.search = ''
      return NextResponse.redirect(url)
    }
    return NextResponse.next({ request })
  }

  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p))

  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  if (user && pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/hoje'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return response
}
