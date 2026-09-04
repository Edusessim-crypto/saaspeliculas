/**
 * Teste de isolamento multi-tenant contra o banco real.
 *
 * Autentica como usuarios reais (chave anon, RLS ativo) e confirma que:
 *  1. um membro so enxerga dados da propria organizacao;
 *  2. uma organizacao estranha nao vaza nem uma linha;
 *  3. o aplicador nao acessa o que seu papel nao permite;
 *  4. anonimo nao le nada.
 *
 * A `service_role` ignora RLS por design — por isso o seed usa ela e este
 * teste NAO usa.
 */
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!

let failures = 0
function check(label: string, pass: boolean, detail = '') {
  if (!pass) failures++
  console.log(`${pass ? 'OK  ' : 'FALHA'} ${label}${detail ? ' — ' + detail : ''}`)
}

async function signIn(email: string) {
  const c = createClient(url, anon)
  const { error } = await c.auth.signInWithPassword({ email, password: 'filmflow123' })
  if (error) throw new Error(`login ${email}: ${error.message}`)
  return c
}

async function main() {
  // Organizacao intrusa, criada com service_role para simular outro tenant.
  const admin = createClient(url, service, { auth: { persistSession: false } })
  const { data: intruder, error: intruderErr } = await admin
    .from('organizations')
    .insert({ name: 'Concorrente LTDA', slug: `concorrente-${Date.now()}` })
    .select('id')
    .single()
  if (intruderErr) throw new Error(`criar org intrusa: ${intruderErr.message}`)

  const { data: intruderCustomer } = await admin
    .from('customers')
    .insert({ organization_id: intruder.id, name: 'Cliente Secreto', phone: '51999990000' })
    .select('id')
    .single()

  try {
    const owner = await signIn('eduardo@filmstar.demo')
    const applicator = await signIn('carlos@filmstar.demo')

    const { data: ownerOrgs } = await owner.from('organizations').select('id, name')
    check('Owner enxerga apenas a propria organizacao',
      ownerOrgs?.length === 1 && ownerOrgs[0]!.id !== intruder.id,
      `viu ${ownerOrgs?.length ?? 0}: ${ownerOrgs?.map((o) => o.name).join(', ')}`)

    const { data: ownerOrders } = await owner.from('service_orders').select('id, organization_id')
    const leaked = ownerOrders?.filter((o) => o.organization_id === intruder.id) ?? []
    check('Owner nao ve atendimentos de outra organizacao', leaked.length === 0,
      `${ownerOrders?.length ?? 0} atendimentos, ${leaked.length} vazados`)

    const { data: crossCustomer } = await owner
      .from('customers').select('id').eq('id', intruderCustomer!.id)
    check('Cliente de outra organizacao invisivel por id direto',
      (crossCustomer?.length ?? 0) === 0)

    const { error: writeErr } = await owner
      .from('customers')
      .insert({ organization_id: intruder.id, name: 'Invasao', phone: '51988887777' })
    check('Escrita em organizacao alheia bloqueada', writeErr !== null,
      writeErr ? 'rejeitada pelo RLS' : 'INSERT PASSOU — falha grave')

    const { data: appOrders } = await applicator.from('service_orders').select('id')
    check('Aplicador acessa atendimentos da loja', (appOrders?.length ?? 0) > 0,
      `${appOrders?.length ?? 0} visiveis`)

    const { error: appWriteErr } = await applicator
      .from('service_types')
      .insert({ organization_id: ownerOrgs![0]!.id, name: 'Servico pirata', category: 'outros', default_duration_minutes: 30 })
    check('Aplicador nao cria tipo de servico', appWriteErr !== null,
      appWriteErr ? 'rejeitada' : 'INSERT PASSOU — falha de permissao')

    const anonClient = createClient(url, anon)
    const { data: anonRows } = await anonClient.from('service_orders').select('id')
    check('Anonimo nao le atendimentos', (anonRows?.length ?? 0) === 0,
      `${anonRows?.length ?? 0} linhas`)
  } finally {
    if (intruderCustomer) await admin.from('customers').delete().eq('id', intruderCustomer.id)
    await admin.from('organizations').delete().eq('id', intruder.id)
  }

  console.log(failures === 0 ? '\nIsolamento multi-tenant confirmado.' : `\n${failures} falha(s).`)
  if (failures > 0) process.exitCode = 1
}

main().catch((e) => { console.error('ERRO:', e.message); process.exit(1) })
