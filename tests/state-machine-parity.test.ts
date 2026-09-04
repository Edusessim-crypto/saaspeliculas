import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { ORDER_STATUSES, type OrderStatus } from '@/domain/status'
import { allowedTransitions } from '@/domain/state-machine'

/**
 * O grafo de transicoes existe em dois lugares: TRANSITIONS em
 * src/domain/state-machine.ts e order_status_can_transition() na migration
 * 20260101000003. Divergencia entre os dois deixa a UI e o banco discordando
 * sobre o que e permitido — foi assim que um UPDATE direto pulou de
 * 'scheduled' para 'delivered' antes da migration existir.
 *
 * Este teste le o SQL e compara com o dominio.
 */
const SQL_PATH = resolve(
  import.meta.dirname,
  '../supabase/migrations/20260101000003_enforce_state_machine.sql',
)

function parseSqlTransitions(): Record<string, string[]> {
  const sql = readFileSync(SQL_PATH, 'utf8')
  const graph: Record<string, string[]> = {}

  for (const match of sql.matchAll(
    /when\s+'(\w+)'\s+then\s+to_status\s+in\s*\(([^)]*)\)/g,
  )) {
    const from = match[1]!
    const targets = [...match[2]!.matchAll(/'(\w+)'/g)].map((m) => m[1]!)
    graph[from] = targets
  }

  // O `else false` cobre os terminais, que nao aparecem no CASE.
  for (const status of ORDER_STATUSES) {
    graph[status] ??= []
  }

  return graph
}

describe('paridade entre a state machine do dominio e a do banco', () => {
  const sqlGraph = parseSqlTransitions()

  it('a migration declara todos os status conhecidos', () => {
    expect(Object.keys(sqlGraph).sort()).toEqual([...ORDER_STATUSES].sort())
  })

  it.each(ORDER_STATUSES)('transicoes de "%s" batem nos dois lados', (status) => {
    const domain = [...allowedTransitions(status as OrderStatus)].sort()
    const sqlSide = [...(sqlGraph[status] ?? [])].sort()
    expect(sqlSide).toEqual(domain)
  })
})
