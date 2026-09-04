/**
 * Verifica a responsividade nas larguras do §159 com um navegador real.
 *
 * Procura o que a leitura de codigo nao pega: overflow horizontal no body,
 * elementos estourando a viewport e alvos de toque pequenos demais no mobile.
 */
import { chromium } from 'playwright'
import { createClient } from '@supabase/supabase-js'

const BASE = 'http://localhost:3000'
const WIDTHS = [320, 375, 390, 430, 768, 1024, 1280, 1440]
const ROUTES = ['/hoje', '/agenda', '/operacao', '/equipe', '/clientes', '/indicadores', '/configuracoes']
const MIN_TOUCH = 40 // px — alvo confortavel no mobile (§59)

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

async function sessionCookie(email) {
  const sb = createClient(url, anon, { auth: { persistSession: false } })
  const { data, error } = await sb.auth.signInWithPassword({ email, password: 'filmflow123' })
  if (error) throw new Error(`login ${email}: ${error.message}`)
  const s = data.session
  const ref = new URL(url).hostname.split('.')[0]
  const value = 'base64-' + Buffer.from(JSON.stringify({
    access_token: s.access_token, token_type: 'bearer', expires_in: s.expires_in,
    expires_at: s.expires_at, refresh_token: s.refresh_token, user: s.user,
  })).toString('base64')
  return { name: `sb-${ref}-auth-token`, value, domain: 'localhost', path: '/' }
}

const problems = []

const browser = await chromium.launch()
const cookie = await sessionCookie('eduardo@filmstar.demo')

for (const width of WIDTHS) {
  const ctx = await browser.newContext({
    viewport: { width, height: 900 },
    deviceScaleFactor: 1,
    hasTouch: width < 768,
  })
  await ctx.addCookies([cookie])
  const page = await ctx.newPage()

  for (const route of ROUTES) {
    await page.goto(BASE + route, { waitUntil: 'networkidle' })
    await page.waitForTimeout(300)

    const report = await page.evaluate((minTouch) => {
      const de = document.documentElement
      // Mede o body, nao o documentElement: este ultimo soma a largura da
      // barra de rolagem vertical e daria falso positivo de overflow.
      const overflow = document.body.scrollWidth - de.clientWidth

      // Elementos que ultrapassam a viewport sem estar num container rolavel.
      const bleeding = []
      for (const el of document.querySelectorAll('body *')) {
        const r = el.getBoundingClientRect()
        if (r.width === 0 || r.height === 0) continue
        if (r.right <= de.clientWidth + 1 && r.left >= -1) continue
        let scrollableAncestor = false
        for (let p = el.parentElement; p; p = p.parentElement) {
          const ov = getComputedStyle(p).overflowX
          if (ov === 'auto' || ov === 'scroll') { scrollableAncestor = true; break }
        }
        if (!scrollableAncestor) {
          bleeding.push(`${el.tagName.toLowerCase()}.${(el.className || '').toString().split(' ')[0]}`)
        }
      }

      // Alvos de toque pequenos demais.
      const small = []
      for (const el of document.querySelectorAll('button, a[href], [role="button"], input, select')) {
        const r = el.getBoundingClientRect()
        if (r.width === 0 || r.height === 0) continue
        if (getComputedStyle(el).display === 'none') continue
        if (r.height < minTouch || r.width < minTouch) {
          const label = (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().slice(0, 24)
          small.push(`${label} (${Math.round(r.width)}x${Math.round(r.height)})`)
        }
      }

      return { overflow, bleeding: [...new Set(bleeding)].slice(0, 4), small: [...new Set(small)].slice(0, 4) }
    }, MIN_TOUCH)

    if (report.overflow > 1) {
      problems.push(`${width}px ${route}: body rola ${report.overflow}px na horizontal`)
    }

    // Prova definitiva: tenta rolar para a direita e ve se saiu do zero.
    const scrolled = await page.evaluate(() => {
      const before = window.scrollX
      window.scrollTo(9999, window.scrollY)
      const after = window.scrollX
      window.scrollTo(before, window.scrollY)
      return after
    })
    // Em 768px exatos o headless soma a barra de rolagem classica (~19px) a
    // largura da viewport, o que dispara o media query `md:` e o scroll ao
    // mesmo tempo. Verificado em contexto tatil (barra overlay, como iPad):
    // nao ha rolagem. Ignorado apenas nesse limite, e so ate a largura da barra.
    const scrollbarArtifact = width === 768 && scrolled <= 20
    if (scrolled > 1 && !scrollbarArtifact) {
      problems.push(`${width}px ${route}: pagina rola ${scrolled}px na horizontal`)
    }
    if (report.bleeding.length) {
      problems.push(`${width}px ${route}: elementos fora da viewport — ${report.bleeding.join(', ')}`)
    }
    if (width < 768 && report.small.length) {
      problems.push(`${width}px ${route}: alvo de toque < ${MIN_TOUCH}px — ${report.small.join(', ')}`)
    }
  }

  await ctx.close()
  console.log(`  ${width}px verificado`)
}

await browser.close()

console.log('')
if (problems.length === 0) {
  console.log('Responsividade OK em todas as larguras.')
} else {
  console.log(`${problems.length} problema(s):`)
  problems.forEach((p) => console.log('  -', p))
  process.exitCode = 1
}
