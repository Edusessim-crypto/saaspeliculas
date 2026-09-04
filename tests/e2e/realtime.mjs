/**
 * Verifica a promessa central do produto (§73, §141): o aplicador finaliza no
 * celular e a tela da recepcao muda sozinha, sem F5.
 *
 * Duas sessoes reais e simultaneas em navegadores separados — recepcao no
 * desktop, aplicador no mobile.
 */
import { chromium } from 'playwright'
import { createClient } from '@supabase/supabase-js'

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3000'
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const service = process.env.SUPABASE_SERVICE_ROLE_KEY

let failures = 0
const check = (label, pass, detail = '') => {
  if (!pass) failures++
  console.log(`${pass ? 'OK  ' : 'FALHA'} ${label}${detail ? ' — ' + detail : ''}`)
}

async function cookieFor(email) {
  const sb = createClient(url, anon, { auth: { persistSession: false } })
  const { data, error } = await sb.auth.signInWithPassword({ email, password: 'filmflow123' })
  if (error) throw new Error(`login ${email}: ${error.message}`)
  const s = data.session
  const ref = new URL(url).hostname.split('.')[0]
  return {
    name: `sb-${ref}-auth-token`,
    value: 'base64-' + Buffer.from(JSON.stringify({
      access_token: s.access_token, token_type: 'bearer', expires_in: s.expires_in,
      expires_at: s.expires_at, refresh_token: s.refresh_token, user: s.user,
    })).toString('base64'),
    domain: new URL(BASE).hostname,
    path: '/',
    secure: BASE.startsWith('https'),
  }
}

const admin = createClient(url, service, { auth: { persistSession: false } })

// Monta um atendimento em aplicacao, atribuido a Carlos.
const { data: seed } = await admin
  .from('service_orders')
  .select('organization_id, location_id, customer_id, vehicle_id')
  .limit(1).single()
const { data: emp } = await admin
  .from('employees').select('id').eq('role', 'applicator').not('user_id', 'is', null).limit(1).single()

const start = new Date()
const { data: order, error: orderErr } = await admin.from('service_orders').insert({
  organization_id: seed.organization_id,
  location_id: seed.location_id,
  customer_id: seed.customer_id,
  vehicle_id: seed.vehicle_id,
  scheduled_start: start.toISOString(),
  scheduled_end: new Date(start.getTime() + 5400_000).toISOString(),
  current_status: 'application',
  internal_notes: 'realtime e2e (temporario)',
}).select('id, code').single()
if (orderErr) throw new Error('criar atendimento: ' + orderErr.message)

await admin.from('service_order_employees').insert({
  organization_id: seed.organization_id,
  service_order_id: order.id,
  employee_id: emp.id,
})

const browser = await chromium.launch()
try {
  // Recepcao no desktop, na tela de Operacao.
  const deskCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  await deskCtx.addCookies([await cookieFor('mariana@filmstar.demo')])
  const desk = await deskCtx.newPage()
  await desk.goto(BASE + '/operacao', { waitUntil: 'networkidle' })
  await desk.waitForTimeout(1200)

  const before = await desk.evaluate(() => document.body.innerText)
  check('Recepcao ve o atendimento em aplicacao',
    before.includes('Em aplicação') || before.includes('aplicação'))

  // Aplicador no celular avanca o servico.
  const mobCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
  await mobCtx.addCookies([await cookieFor('carlos@filmstar.demo')])
  const mob = await mobCtx.newPage()
  await mob.goto(BASE + '/app', { waitUntil: 'networkidle' })
  await mob.waitForTimeout(800)
  check('Aplicador ve seu servico no celular',
    (await mob.evaluate(() => document.body.innerText)).length > 100)

  // A transicao vem pelo banco, como se o aplicador tivesse tocado o botao.
  const applicatorSb = createClient(url, anon, { auth: { persistSession: false } })
  await applicatorSb.auth.signInWithPassword({ email: 'carlos@filmstar.demo', password: 'filmflow123' })
  const t0 = Date.now()
  const { error: upErr } = await applicatorSb
    .from('service_orders').update({ current_status: 'inspection' }).eq('id', order.id)
  check('Aplicador finaliza a aplicacao', !upErr, upErr?.message ?? '-> conferencia')

  // A tela da recepcao deve refletir sozinha, sem reload.
  let propagated = false
  let elapsed = 0
  for (let i = 0; i < 40; i++) {
    await desk.waitForTimeout(250)
    const text = await desk.evaluate(() => document.body.innerText)
    if (text.includes('Em conferência') || text.includes('conferência')) {
      propagated = true
      elapsed = Date.now() - t0
      break
    }
  }
  check('Recepcao atualiza sozinha, sem F5', propagated,
    propagated ? `propagou em ${(elapsed / 1000).toFixed(1)}s` : 'nao propagou em 10s')

  const url_ = desk.url()
  check('Sem reload da pagina', url_.includes('/operacao'))

  await deskCtx.close()
  await mobCtx.close()
} finally {
  await browser.close()
  await admin.from('status_history').delete().eq('service_order_id', order.id)
  await admin.from('notifications').delete().eq('service_order_id', order.id)
  await admin.from('service_order_employees').delete().eq('service_order_id', order.id)
  await admin.from('service_orders').delete().eq('id', order.id)
}

console.log(failures === 0 ? '\nRealtime funcionando ponta a ponta.' : `\n${failures} falha(s).`)
if (failures > 0) process.exitCode = 1
