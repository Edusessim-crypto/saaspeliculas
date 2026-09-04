'use client'

import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

let singleton: ReturnType<typeof createClient> | null = null

/** Uma unica instancia no browser evita multiplas conexoes de realtime. */
export function getSupabaseBrowser() {
  singleton ??= createClient()
  return singleton
}
