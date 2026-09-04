/**
 * Aplica as migrations versionadas contra o Postgres do Supabase.
 *
 * Existe porque `supabase db push` exige login interativo de conta, e as
 * migrations criam trigger em `auth.users` — o que a API REST nao permite.
 *
 * Registra o que ja rodou em `schema_migrations`, entao reexecutar aplica
 * apenas o que falta. Cada arquivo roda em transacao propria: falhou, nada
 * daquele arquivo e aplicado.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { Client } from 'pg'

const connectionString = process.env.SUPABASE_DB_URL

if (!connectionString) {
  console.error('Defina SUPABASE_DB_URL com a connection string do Postgres.')
  process.exit(1)
}

const dir = resolve(import.meta.dirname, '../supabase/migrations')
const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()

const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } })

async function main() {
  await client.connect()

  await client.query(`
    create table if not exists schema_migrations (
      version text primary key,
      applied_at timestamptz not null default now()
    )
  `)

  const { rows } = await client.query<{ version: string }>('select version from schema_migrations')
  const applied = new Set(rows.map((r) => r.version))
  const pending = files.filter((f) => !applied.has(f))

  if (pending.length === 0) {
    console.log(`Nada a aplicar — ${files.length} migrations ja registradas.`)
    return
  }

  console.log(`${applied.size} ja aplicadas, ${pending.length} pendente(s).\n`)

  for (const file of pending) {
    const sql = readFileSync(resolve(dir, file), 'utf8')
    process.stdout.write(`  ${file} ... `)
    try {
      await client.query('begin')
      await client.query(sql)
      await client.query('insert into schema_migrations (version) values ($1)', [file])
      await client.query('commit')
      console.log('OK')
    } catch (error) {
      await client.query('rollback')
      console.log('FALHOU')
      console.error(`\n${(error as Error).message}\n`)
      throw error
    }
  }

  const { rows: t } = await client.query<{ tables: number }>(
    `select count(*)::int as tables from information_schema.tables where table_schema = 'public'`,
  )
  console.log(`\nConcluido. ${t[0]?.tables ?? 0} tabelas em public.`)
}

main()
  .catch(() => process.exit(1))
  .finally(() => client.end())
