import type { OrderStatus } from './status'
import { STATUS_CONFIG } from './status'
import type { AppRole } from './roles'

/**
 * Grafo de transicoes permitidas.
 *
 * Regra de negocio: o fluxo avanca linearmente, mas permitimos retrocessos
 * curtos de uma etapa (erro de clique e o evento mais comum na operacao real,
 * e obrigar o gestor a "reabrir" nesse caso trava a loja). O que NAO se
 * permite e pular de um estado terminal de volta para producao sem
 * reabertura explicita — ver `reopen()`.
 */
const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  scheduled: ['arrived', 'cancelled', 'no_show'],
  arrived: ['waiting', 'scheduled', 'cancelled'],
  waiting: ['preparation', 'application', 'arrived', 'cancelled'],
  preparation: ['application', 'waiting', 'cancelled'],
  application: ['inspection', 'preparation', 'cancelled'],
  inspection: ['ready', 'application', 'cancelled'],
  ready: ['delivered', 'inspection'],
  delivered: [],
  cancelled: [],
  no_show: [],
}

/** Estados a partir dos quais so se sai por reabertura explicita. */
export const TERMINAL_STATUSES: OrderStatus[] = ['delivered', 'cancelled', 'no_show']

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  if (from === to) return false
  return TRANSITIONS[from].includes(to)
}

export function allowedTransitions(from: OrderStatus): OrderStatus[] {
  return TRANSITIONS[from]
}

export function isTerminal(status: OrderStatus): boolean {
  return TERMINAL_STATUSES.includes(status)
}

export interface TransitionCheck {
  allowed: boolean
  reason?: string
  /** Exige checklist preenchido antes de efetivar */
  requiresChecklist?: boolean
  /** Exige confirmacao explicita do usuario */
  requiresConfirmation?: boolean
  /** Exige um motivo textual */
  requiresReason?: boolean
}

/**
 * Verificacao completa de uma transicao, considerando o papel do usuario.
 * O frontend usa isso para habilitar botoes; o backend (RLS) impede o resto.
 */
export function checkTransition(
  from: OrderStatus,
  to: OrderStatus,
  role: AppRole,
): TransitionCheck {
  if (from === to) {
    return { allowed: false, reason: 'O atendimento já está neste status.' }
  }

  if (isTerminal(from)) {
    return {
      allowed: false,
      reason: `Atendimento ${STATUS_CONFIG[from].label.toLowerCase()}. É necessário reabrir para alterar.`,
    }
  }

  if (!canTransition(from, to)) {
    return {
      allowed: false,
      reason: `Não é possível ir de "${STATUS_CONFIG[from].label}" para "${STATUS_CONFIG[to].label}".`,
    }
  }

  // O aplicador conduz a execucao, mas nao aprova o proprio trabalho
  // nem entrega o veiculo ao cliente.
  if (role === 'applicator') {
    const applicatorAllowed: OrderStatus[] = ['preparation', 'application', 'inspection']
    if (!applicatorAllowed.includes(to)) {
      return {
        allowed: false,
        reason: 'Somente a recepção ou a gestão pode realizar esta etapa.',
      }
    }
  }

  return {
    allowed: true,
    requiresChecklist: to === 'inspection',
    requiresConfirmation: to === 'cancelled' || to === 'no_show' || to === 'delivered',
    requiresReason: to === 'cancelled',
  }
}

/** Reabertura explicita de um atendimento terminal (§97). */
export function canReopen(status: OrderStatus, role: AppRole): boolean {
  return isTerminal(status) && (role === 'owner' || role === 'manager')
}

/**
 * Proxima acao natural do fluxo. Usada para renderizar o botao primario
 * — sempre um unico CTA obvio por vez (§26).
 */
export interface PrimaryAction {
  to: OrderStatus
  label: string
}

const PRIMARY_ACTIONS: Partial<Record<OrderStatus, PrimaryAction>> = {
  scheduled: { to: 'arrived', label: 'Registrar chegada' },
  arrived: { to: 'waiting', label: 'Liberar para produção' },
  waiting: { to: 'preparation', label: 'Iniciar preparação' },
  preparation: { to: 'application', label: 'Iniciar aplicação' },
  application: { to: 'inspection', label: 'Finalizar aplicação' },
  inspection: { to: 'ready', label: 'Aprovar serviço' },
  ready: { to: 'delivered', label: 'Marcar como entregue' },
}

export function primaryAction(
  status: OrderStatus,
  role: AppRole,
): PrimaryAction | null {
  const action = PRIMARY_ACTIONS[status]
  if (!action) return null
  if (!checkTransition(status, action.to, role).allowed) return null
  return action
}
