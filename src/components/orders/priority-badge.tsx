import { ChevronUp, ChevronsUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { OrderPriority } from '@/types/database'

/** Prioridade sinalizada com discricao: normal nao gera ruido visual (§84). */
export function PriorityBadge({ priority }: { priority: OrderPriority }) {
  if (priority === 'normal') return null

  return priority === 'urgent' ? (
    <Badge variant="danger">
      <ChevronsUp className="size-3" aria-hidden />
      Urgente
    </Badge>
  ) : (
    <Badge variant="warning">
      <ChevronUp className="size-3" aria-hidden />
      Prioritário
    </Badge>
  )
}
