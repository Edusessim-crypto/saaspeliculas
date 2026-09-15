'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { MoreHorizontal, CalendarClock, Ban, MessageSquarePlus, UserX, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Textarea } from '@/components/ui/input'
import { Field } from '@/components/ui/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { changeOrderStatus, reopenOrder } from '@/lib/actions/orders'
import { primaryAction, canReopen, isTerminal } from '@/domain/state-machine'
import type { OrderStatus } from '@/domain/status'
import { CANCELLATION_REASONS } from '@/domain/defaults'
import { can, type AppRole } from '@/domain/roles'
import type { ServiceOrderView } from '@/types/database'
import { markLocalMutation } from '@/lib/local-mutation'

interface OrderActionsProps {
  order: ServiceOrderView
  role: AppRole
  onChecklistRequired?: () => void
  onReschedule?: () => void
  onAddNote?: () => void
  layout?: 'drawer' | 'inline'
}

/**
 * Uma unica acao primaria visualmente obvia; o resto vai para o menu (§26).
 */
export function OrderActions({
  order,
  role,
  onChecklistRequired,
  onReschedule,
  onAddNote,
  layout = 'drawer',
}: OrderActionsProps) {
  const [pending, startTransition] = useTransition()
  const [cancelOpen, setCancelOpen] = useState(false)
  const [noShowOpen, setNoShowOpen] = useState(false)
  const [deliverOpen, setDeliverOpen] = useState(false)
  const [reason, setReason] = useState<string>(CANCELLATION_REASONS[0])
  const [reasonNote, setReasonNote] = useState('')

  // Status otimista: o botao reflete a acao na hora e so volta atras se o
  // servidor recusar. Sem isso o botao ficava ~1s em "pending" esperando a
  // rede, e o usuario clicava de novo achando que nao tinha funcionado.
  const [optimisticStatus, setOptimisticStatus] = useState<OrderStatus | null>(null)
  const status = optimisticStatus ?? order.current_status

  // Quando o servidor confirma, a prop chega atualizada e o otimismo sai.
  if (optimisticStatus && order.current_status === optimisticStatus) {
    setOptimisticStatus(null)
  }

  const action = primaryAction(status, role)
  const terminal = isTerminal(status)

  function advance(to: Parameters<typeof changeOrderStatus>[0] extends never ? never : string) {
    setOptimisticStatus(to as OrderStatus)
    markLocalMutation()
    startTransition(async () => {
      const result = await changeOrderStatus({ order_id: order.id, to })
      if (!result.ok) {
        setOptimisticStatus(null)
        if (result.error === 'CHECKLIST_REQUIRED') {
          onChecklistRequired?.()
          toast.info('Preencha o checklist para concluir.')
          return
        }
        toast.error(result.error ?? 'Não foi possível atualizar.')
        return
      }
      toast.success(SUCCESS_MESSAGES[to] ?? 'Atendimento atualizado.')
      markLocalMutation()
    })
  }

  function confirmCancel() {
    startTransition(async () => {
      const note = reason === 'Outro' ? reasonNote.trim() || 'Outro' : reason
      const result = await changeOrderStatus({
        order_id: order.id,
        to: 'cancelled',
        reason: note,
      })
      if (!result.ok) {
        toast.error(result.error ?? 'Não foi possível cancelar.')
        return
      }
      setCancelOpen(false)
      toast.success('Atendimento cancelado.')
      markLocalMutation()
    })
  }

  return (
    <>
      <div className={layout === 'drawer' ? 'flex w-full items-center gap-2' : 'flex items-center gap-2'}>
        {action ? (
          <Button
            variant="primary"
            size={layout === 'drawer' ? 'lg' : 'md'}
            className="flex-1"
            loading={pending}
            onClick={() => {
              if (action.to === 'delivered') {
                setDeliverOpen(true)
                return
              }
              advance(action.to)
            }}
          >
            {action.label}
          </Button>
        ) : terminal && canReopen(order.current_status, role) ? (
          <Button
            variant="secondary"
            size={layout === 'drawer' ? 'lg' : 'md'}
            className="flex-1"
            loading={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await reopenOrder(order.id, 'waiting')
                if (!result.ok) {
                  toast.error(result.error ?? 'Não foi possível reabrir.')
                  return
                }
                toast.success('Atendimento reaberto.')
                markLocalMutation()
              })
            }
          >
            <RotateCcw />
            Reabrir atendimento
          </Button>
        ) : null}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="secondary"
              size={layout === 'drawer' ? 'lg' : 'icon'}
              aria-label="Mais ações"
              className={layout === 'drawer' ? 'w-11 px-0' : ''}
            >
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end">
            {onAddNote ? (
              <DropdownMenuItem onSelect={onAddNote}>
                <MessageSquarePlus />
                Adicionar observação
              </DropdownMenuItem>
            ) : null}

            {can(role, 'orders:edit') && !terminal && onReschedule ? (
              <DropdownMenuItem onSelect={onReschedule}>
                <CalendarClock />
                Reagendar
              </DropdownMenuItem>
            ) : null}

            {can(role, 'orders:cancel') && !terminal ? (
              <>
                <DropdownMenuSeparator />
                {order.current_status === 'scheduled' ? (
                  <DropdownMenuItem onSelect={() => setNoShowOpen(true)}>
                    <UserX />
                    Não compareceu
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem destructive onSelect={() => setCancelOpen(true)}>
                  <Ban />
                  Cancelar atendimento
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancelar atendimento?"
        description="O atendimento sai da operação, mas o histórico é preservado."
        confirmLabel="Cancelar atendimento"
        cancelLabel="Voltar"
        destructive
        loading={pending}
        onConfirm={confirmCancel}
      >
        <div className="space-y-3">
          <Field label="Motivo" htmlFor="cancel-reason">
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger id="cancel-reason">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CANCELLATION_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          {reason === 'Outro' ? (
            <Field label="Descreva o motivo" htmlFor="cancel-note">
              <Textarea
                id="cancel-note"
                value={reasonNote}
                onChange={(e) => setReasonNote(e.target.value)}
                placeholder="Opcional"
                rows={2}
              />
            </Field>
          ) : null}
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={noShowOpen}
        onOpenChange={setNoShowOpen}
        title="Marcar como não compareceu?"
        description="Use quando o cliente não apareceu no horário agendado."
        confirmLabel="Não compareceu"
        destructive
        loading={pending}
        onConfirm={() => {
          startTransition(async () => {
            const result = await changeOrderStatus({ order_id: order.id, to: 'no_show' })
            if (!result.ok) {
              toast.error(result.error ?? 'Não foi possível atualizar.')
              return
            }
            setNoShowOpen(false)
            toast.success('Registrado como não compareceu.')
            markLocalMutation()
          })
        }}
      />

      <ConfirmDialog
        open={deliverOpen}
        onOpenChange={setDeliverOpen}
        title="Confirmar entrega do veículo?"
        description="O atendimento será encerrado e sai do quadro operacional."
        confirmLabel="Marcar como entregue"
        loading={pending}
        onConfirm={() => {
          setDeliverOpen(false)
          advance('delivered')
        }}
      />
    </>
  )
}

const SUCCESS_MESSAGES: Record<string, string> = {
  arrived: 'Chegada registrada.',
  waiting: 'Liberado para produção.',
  preparation: 'Preparação iniciada.',
  application: 'Serviço iniciado.',
  inspection: 'Serviço concluído. Aguardando conferência.',
  ready: 'Veículo pronto para entrega.',
  delivered: 'Veículo entregue.',
}
