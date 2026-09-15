/**
 * Sinaliza que este cliente acabou de mutar dados.
 *
 * Fica num modulo proprio, sem nenhuma dependencia: importar isto nao pode
 * arrastar o cliente do Supabase para dentro de telas que nunca usaram
 * realtime (foi o que aconteceu quando morava em use-realtime-orders.ts e
 * inflou varias rotas em ~70kB).
 */

/** Janela em que ecos da propria mutacao sao ignorados. */
export const SELF_MUTATION_WINDOW_MS = 1500

const lastLocalMutation = { current: 0 }

/** Chamado no clique, antes do await — o eco pode chegar antes da resposta. */
export function markLocalMutation() {
  lastLocalMutation.current = Date.now()
}

export function isEchoOfLocalMutation() {
  return Date.now() - lastLocalMutation.current < SELF_MUTATION_WINDOW_MS
}
