'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowser } from '@/lib/supabase/client'
import { isEchoOfLocalMutation } from '@/lib/local-mutation'
import { DEMO_MODE } from '@/lib/demo'

/**
 * Mantem a tela sincronizada com a operacao (§73, §141).
 *
 * Estrategia: em vez de reconstruir o objeto composto no cliente (que
 * exigiria refazer os joins), a mudanca dispara um router.refresh() com
 * debounce. O Server Component recarrega e o React reconcilia sem piscar.
 * Assinamos apenas a organizacao atual (§136).
 */
export function useRealtimeOrders(organizationId: string, enabled = true) {
  const router = useRouter()
  const [lastUpdate, setLastUpdate] = useState<Date>(() => new Date())
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // Sem banco no modo demonstracao nao ha o que assinar; tentar conectar
    // so gera erro de WebSocket no console.
    if (!enabled || DEMO_MODE) return
    const supabase = getSupabaseBrowser()

    const scheduleRefresh = () => {
      // A mutacao deste proprio usuario ja revalidou no servidor (a Server
      // Action chama revalidatePath). Refazer aqui gastaria outra ida de
      // rede e trocaria a arvore no meio do clique — origem do "precisei
      // clicar duas vezes". Ignoramos a janela logo apos a acao local.
      if (isEchoOfLocalMutation()) return

      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => {
        router.refresh()
        setLastUpdate(new Date())
      }, 350)
    }

    const channel = supabase
      .channel(`orders:${organizationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'service_orders',
          filter: `organization_id=eq.${organizationId}`,
        },
        scheduleRefresh,
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'service_order_employees',
          filter: `organization_id=eq.${organizationId}`,
        },
        scheduleRefresh,
      )
      .subscribe()

    return () => {
      if (timer.current) clearTimeout(timer.current)
      void supabase.removeChannel(channel)
    }
  }, [organizationId, enabled, router])

  return { lastUpdate }
}
