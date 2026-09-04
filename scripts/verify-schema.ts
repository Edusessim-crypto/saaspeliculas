/**
 * Confere que o schema aplicado esta integro e, sobretudo, que o RLS esta
 * ATIVO em toda tabela — nao basta a policy existir se `rowsecurity` estiver
 * desligado. Rode apos qualquer migration que mexa em tabelas ou policies.
 */
import { Client } from 'pg'

const connectionString = process.env.SUPABASE_DB_URL
if (!connectionString) {
  console.error('Defina SUPABASE_DB_URL.')
  process.exit(1)
}

const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } })
let failures = 0

function report(label: string, rows: string[], expectEmpty = true) {
  const ok = expectEmpty ? rows.length === 0 : rows.length > 0
  if (!ok) failures++
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${label}${rows.length ? ': ' + rows.join(', ') : ''}`)
}

async function main() {
  await client.connect()

  const tables = await client.query<{ tablename: string }>(
    `select tablename from pg_tables where schemaname = 'public' order by 1`,
  )
  console.log(`Tabelas em public: ${tables.rows.length}\n`)

  const noRls = await client.query<{ tablename: string }>(
    `select tablename from pg_tables
     where schemaname = 'public' and not rowsecurity order by 1`,
  )
  report('RLS ativo em todas as tabelas', noRls.rows.map((r) => r.tablename))

  const noPolicy = await client.query<{ tablename: string }>(
    `select t.tablename from pg_tables t
     left join pg_policies p on p.tablename = t.tablename and p.schemaname = 'public'
     where t.schemaname = 'public'
     group by t.tablename having count(p.policyname) = 0 order by 1`,
  )
  report('Toda tabela tem ao menos uma policy', noPolicy.rows.map((r) => r.tablename))

  const policies = await client.query<{ n: number }>(
    `select count(*)::int as n from pg_policies where schemaname = 'public'`,
  )
  console.log(`     Policies: ${policies.rows[0]?.n ?? 0}`)

  const expectedFns = [
    'auth_can_operate', 'auth_is_admin', 'auth_is_assigned', 'auth_is_member',
    'auth_org_ids', 'auth_role_in', 'check_schedule_conflicts',
    'handle_new_user', 'handle_order_created', 'handle_status_change', 'set_updated_at',
  ]
  const fns = await client.query<{ proname: string }>(
    `select distinct proname from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'`,
  )
  const found = new Set(fns.rows.map((r) => r.proname))
  report('Funcoes esperadas presentes', expectedFns.filter((f) => !found.has(f)))

  const trg = await client.query<{ n: number }>(
    `select count(*)::int as n from pg_trigger where not tgisinternal`,
  )
  console.log(`     Triggers: ${trg.rows[0]?.n ?? 0}`)

  const authTrigger = await client.query<{ n: number }>(
    `select count(*)::int as n from pg_trigger t
     join pg_class c on c.oid = t.tgrelid
     join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'auth' and c.relname = 'users' and not t.tgisinternal`,
  )
  report('Trigger em auth.users criado', authTrigger.rows[0]?.n ? [] : ['ausente'])

  console.log(failures === 0 ? '\nSchema integro.' : `\n${failures} verificacao(oes) falharam.`)
  if (failures > 0) process.exitCode = 1
}

main().catch((e) => { console.error(e.message); process.exit(1) }).finally(() => client.end())
