/**
 * Percorre o fluxo operacional completo contra o banco real, como usuarios
 * reais (RLS ativo): AGENDAR -> CHEGADA -> PREPARACAO -> APLICACAO ->
 * CONFERENCIA -> PRONTO -> ENTREGUE.
 *
 * Confirma tambem os efeitos colaterais que o produto promete: status_history
 * a cada transicao, actual_start/actual_end preenchidos e a state machine
 * recusando saltos invalidos.
 */
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

let failures = 0
function check(label: string, pass: boolean, detail = '') {
  if (!pass) failures++
  console.log(`${pass ? 'OK  ' : 'FALHA'} ${label}${detail ? ' — ' + detail : ''}`)
}

async function signIn(email: string) {
  const c = createClient(url, anon, { auth: { persistSession: false } })
  const { error } = await c.auth.signInWithPassword({ email, password: 'filmflow123' })
  if (error) throw new Error(`login ${email}: ${error.message}`)
  return c
}

async function main() {
  const reception = await signIn('mariana@filmstar.demo')
  const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  })

  // Cria o proprio atendimento em vez de consumir os do seed — assim o teste
  // e repetivel e nao deixa a demo sem atendimentos agendados.
  const { data: seedOrder } = await admin
    .from('service_orders')
    .select('organization_id, location_id, customer_id, vehicle_id')
    .limit(1)
    .single()

  const { data: applicatorEmployee } = await admin
    .from('employees')
    .select('id, profiles(email)')
    .not('user_id', 'is', null)
    .eq('role', 'applicator')
    .limit(1)
    .single()

  const start = new Date(Date.now() + 3600_000)
  const { data: order, error } = await admin
    .from('service_orders')
    .insert({
      organization_id: seedOrder!.organization_id,
      location_id: seedOrder!.location_id,
      customer_id: seedOrder!.customer_id,
      vehicle_id: seedOrder!.vehicle_id,
      scheduled_start: start.toISOString(),
      scheduled_end: new Date(start.getTime() + 5400_000).toISOString(),
      current_status: 'scheduled',
      internal_notes: 'verify-flow (temporario)',
    })
    .select('id, current_status')
    .single()
  if (error || !order) throw new Error('criar atendimento de teste: ' + error?.message)

  const { error: assignError } = await admin.from('service_order_employees').insert({
    organization_id: seedOrder!.organization_id,
    service_order_id: order.id,
    employee_id: applicatorEmployee!.id,
  })
  if (assignError) throw new Error('atribuir aplicador: ' + assignError.message)

  const email = (applicatorEmployee as { profiles?: { email?: string } }).profiles?.email
  if (!email) throw new Error('aplicador sem email vinculado')
  const applicator = await signIn(email)
  console.log(`Atendimento ${order.id.slice(0, 8)} em "${order.current_status}" — aplicador: ${email}\n`)

  try {
    const { count: historyBefore } = await reception
      .from('status_history').select('*', { count: 'exact', head: true })
      .eq('service_order_id', order.id)

    // Salto invalido: agendado -> entregue deve ser recusado pela state machine.
    const { error: jumpErr } = await reception
      .from('service_orders').update({ current_status: 'delivered' }).eq('id', order.id)
    const { data: afterJump } = await reception
      .from('service_orders').select('current_status').eq('id', order.id).single()
    check('Salto invalido (agendado -> entregue) nao vinga',
      afterJump?.current_status !== 'delivered',
      jumpErr ? 'rejeitado no banco' : `status ficou "${afterJump?.current_status}"`)

    const steps: Array<[string, typeof reception, string]> = [
      ['arrived', reception, 'recepcao registra chegada'],
      ['waiting', reception, 'aguardando inicio'],
      ['preparation', applicator, 'aplicador inicia preparacao'],
      ['application', applicator, 'aplicador inicia aplicacao'],
      ['inspection', applicator, 'aplicador finaliza -> conferencia'],
      ['ready', reception, 'recepcao aprova -> pronto'],
      ['delivered', reception, 'recepcao entrega'],
    ]

    for (const [status, client, label] of steps) {
      const { error: e } = await client
        .from('service_orders').update({ current_status: status }).eq('id', order.id)
      const { data: now } = await client
        .from('service_orders').select('current_status').eq('id', order.id).single()
      check(label, !e && now?.current_status === status,
        e ? e.message : `status = ${now?.current_status}`)
    }

    const { data: final } = await reception
      .from('service_orders')
      .select('current_status, actual_start, actual_end').eq('id', order.id).single()
    check('Estado final = entregue', final?.current_status === 'delivered')
    check('actual_start preenchido pelo trigger', !!final?.actual_start,
      final?.actual_start ?? 'nulo')
    check('actual_end preenchido pelo trigger', !!final?.actual_end,
      final?.actual_end ?? 'nulo')

    const { count: historyAfter } = await reception
      .from('status_history').select('*', { count: 'exact', head: true })
      .eq('service_order_id', order.id)
    const added = (historyAfter ?? 0) - (historyBefore ?? 0)
    check('status_history registrou cada transicao', added >= steps.length,
      `${added} registros para ${steps.length} transicoes`)

    const { count: notif } = await reception
      .from('notifications').select('*', { count: 'exact', head: true })
    console.log(`     Notificacoes na organizacao: ${notif ?? 0}`)

  } finally {
    await admin.from('status_history').delete().eq('service_order_id', order.id)
    await admin.from('notifications').delete().eq('service_order_id', order.id)
    await admin.from('service_order_employees').delete().eq('service_order_id', order.id)
    await admin.from('service_orders').delete().eq('id', order.id)
  }

  console.log(failures === 0 ? '\nFluxo operacional completo funcionando.' : `\n${failures} falha(s).`)
  if (failures > 0) process.exitCode = 1
}

main().catch((e) => { console.error('ERRO:', e.message); process.exit(1) })
