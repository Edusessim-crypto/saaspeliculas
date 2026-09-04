import { describe, it, expect } from 'vitest'
import {
  canTransition,
  checkTransition,
  isTerminal,
  primaryAction,
  canReopen,
  allowedTransitions,
} from '@/domain/state-machine'
import { ORDER_STATUSES, type OrderStatus } from '@/domain/status'

describe('state machine — fluxo feliz', () => {
  const HAPPY_PATH: OrderStatus[] = [
    'scheduled',
    'arrived',
    'waiting',
    'preparation',
    'application',
    'inspection',
    'ready',
    'delivered',
  ]

  it('permite cada passo do fluxo principal', () => {
    for (let i = 0; i < HAPPY_PATH.length - 1; i++) {
      const from = HAPPY_PATH[i]!
      const to = HAPPY_PATH[i + 1]!
      expect(canTransition(from, to), `${from} → ${to}`).toBe(true)
    }
  })

  it('a ação primária conduz o fluxo do início ao fim', () => {
    let status: OrderStatus = 'scheduled'
    const visited: OrderStatus[] = [status]

    while (true) {
      const action = primaryAction(status, 'owner')
      if (!action) break
      status = action.to
      visited.push(status)
    }

    expect(visited).toEqual(HAPPY_PATH)
  })
})

describe('state machine — transições proibidas', () => {
  it('não permite voltar de entregue para aplicação', () => {
    expect(canTransition('delivered', 'application')).toBe(false)
    expect(checkTransition('delivered', 'application', 'owner').allowed).toBe(false)
  })

  it('não permite pular de agendado direto para pronto', () => {
    expect(canTransition('scheduled', 'ready')).toBe(false)
  })

  it('estados terminais não têm saída', () => {
    for (const status of ['delivered', 'cancelled', 'no_show'] as OrderStatus[]) {
      expect(isTerminal(status)).toBe(true)
      expect(allowedTransitions(status)).toHaveLength(0)
    }
  })

  it('nenhum status transiciona para si mesmo', () => {
    for (const status of ORDER_STATUSES) {
      expect(canTransition(status, status)).toBe(false)
    }
  })

  it('permite retroceder uma etapa para corrigir erro de clique', () => {
    expect(canTransition('application', 'preparation')).toBe(true)
    expect(canTransition('inspection', 'application')).toBe(true)
    expect(canTransition('ready', 'inspection')).toBe(true)
  })
})

describe('state machine — permissões por papel', () => {
  it('o aplicador conduz a execução mas não aprova nem entrega', () => {
    expect(checkTransition('waiting', 'preparation', 'applicator').allowed).toBe(true)
    expect(checkTransition('preparation', 'application', 'applicator').allowed).toBe(true)
    expect(checkTransition('application', 'inspection', 'applicator').allowed).toBe(true)

    expect(checkTransition('inspection', 'ready', 'applicator').allowed).toBe(false)
    expect(checkTransition('ready', 'delivered', 'applicator').allowed).toBe(false)
    expect(checkTransition('scheduled', 'cancelled', 'applicator').allowed).toBe(false)
  })

  it('recepção e gestão avançam o fluxo completo', () => {
    for (const role of ['owner', 'manager', 'reception'] as const) {
      expect(checkTransition('inspection', 'ready', role).allowed).toBe(true)
      expect(checkTransition('ready', 'delivered', role).allowed).toBe(true)
    }
  })

  it('somente a gestão reabre atendimento terminal', () => {
    expect(canReopen('delivered', 'owner')).toBe(true)
    expect(canReopen('delivered', 'manager')).toBe(true)
    expect(canReopen('delivered', 'reception')).toBe(false)
    expect(canReopen('delivered', 'applicator')).toBe(false)
    // Não-terminal não é "reabrir"
    expect(canReopen('application', 'owner')).toBe(false)
  })
})

describe('state machine — requisitos da transição', () => {
  it('ir para conferência exige checklist', () => {
    expect(checkTransition('application', 'inspection', 'owner').requiresChecklist).toBe(true)
  })

  it('cancelar exige motivo e confirmação', () => {
    const check = checkTransition('scheduled', 'cancelled', 'owner')
    expect(check.requiresReason).toBe(true)
    expect(check.requiresConfirmation).toBe(true)
  })

  it('entregar exige confirmação, mas não motivo', () => {
    const check = checkTransition('ready', 'delivered', 'owner')
    expect(check.requiresConfirmation).toBe(true)
    expect(check.requiresReason).toBe(false)
  })
})
