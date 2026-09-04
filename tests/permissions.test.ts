import { describe, it, expect } from 'vitest'
import { can, canAny, defaultRouteFor, APP_ROLES, type AppRole } from '@/domain/roles'

describe('modelo de permissões', () => {
  it('o proprietário pode tudo', () => {
    expect(can('owner', 'org:manage')).toBe(true)
    expect(can('owner', 'team:manage')).toBe(true)
    expect(can('owner', 'orders:force_conflict')).toBe(true)
    expect(can('owner', 'metrics:view')).toBe(true)
  })

  it('somente o proprietário administra a organização', () => {
    expect(can('owner', 'org:manage')).toBe(true)
    for (const role of ['manager', 'reception', 'applicator'] as AppRole[]) {
      expect(can(role, 'org:manage'), role).toBe(false)
    }
  })

  it('a recepção opera a agenda mas não configura o sistema', () => {
    expect(can('reception', 'orders:create')).toBe(true)
    expect(can('reception', 'orders:edit')).toBe(true)
    expect(can('reception', 'customers:manage')).toBe(true)

    expect(can('reception', 'team:manage')).toBe(false)
    expect(can('reception', 'service_types:manage')).toBe(false)
    expect(can('reception', 'org:settings')).toBe(false)
  })

  it('a recepção não força conflito nem reabre atendimento', () => {
    expect(can('reception', 'orders:force_conflict')).toBe(false)
    expect(can('reception', 'orders:reopen')).toBe(false)
  })

  it('o aplicador só avança os próprios serviços', () => {
    expect(can('applicator', 'orders:advance_own')).toBe(true)

    expect(can('applicator', 'orders:create')).toBe(false)
    expect(can('applicator', 'orders:edit')).toBe(false)
    expect(can('applicator', 'orders:cancel')).toBe(false)
    expect(can('applicator', 'customers:manage')).toBe(false)
    expect(can('applicator', 'metrics:view')).toBe(false)
    expect(can('applicator', 'team:view')).toBe(false)
  })

  it('o gerente configura a operação, mas não a organização', () => {
    expect(can('manager', 'team:manage')).toBe(true)
    expect(can('manager', 'service_types:manage')).toBe(true)
    expect(can('manager', 'orders:force_conflict')).toBe(true)
    expect(can('manager', 'org:manage')).toBe(false)
  })

  it('canAny é verdadeiro quando ao menos uma permissão existe', () => {
    expect(canAny('applicator', ['orders:create', 'orders:advance_own'])).toBe(true)
    expect(canAny('applicator', ['orders:create', 'team:manage'])).toBe(false)
  })

  it('o aplicador entra direto na interface mobile', () => {
    expect(defaultRouteFor('applicator')).toBe('/app')
    for (const role of ['owner', 'manager', 'reception'] as AppRole[]) {
      expect(defaultRouteFor(role)).toBe('/hoje')
    }
  })

  it('todo papel tem ao menos uma permissão', () => {
    for (const role of APP_ROLES) {
      expect(can(role, 'orders:advance_own'), role).toBe(true)
    }
  })
})
