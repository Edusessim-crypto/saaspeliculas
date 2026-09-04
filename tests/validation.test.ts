import { describe, it, expect } from 'vitest'
import { customerSchema, vehicleSchema, orderSchema, plateSchema } from '@/lib/validation'

describe('validação de cliente', () => {
  it('aceita cliente com nome e telefone', () => {
    const result = customerSchema.safeParse({
      name: 'João Silva',
      phone: '(51) 99999-9999',
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.phone).toBe('51999999999')
  })

  it('rejeita nome muito curto', () => {
    expect(customerSchema.safeParse({ name: 'J' }).success).toBe(false)
  })

  it('rejeita telefone incompleto', () => {
    expect(customerSchema.safeParse({ name: 'João Silva', phone: '5199' }).success).toBe(false)
  })
})

describe('validação de placa', () => {
  it('aceita o padrão Mercosul e o antigo', () => {
    expect(plateSchema.safeParse('ABC1D23').success).toBe(true)
    expect(plateSchema.safeParse('abc1d23').success).toBe(true)
    expect(plateSchema.safeParse('ABC1234').success).toBe(true)
  })

  it('rejeita formato inválido', () => {
    expect(plateSchema.safeParse('AB1').success).toBe(false)
    expect(plateSchema.safeParse('12345678').success).toBe(false)
  })

  it('aceita vazio — placa é opcional', () => {
    const result = plateSchema.safeParse('')
    expect(result.success).toBe(true)
    if (result.success) expect(result.data).toBeNull()
  })
})

describe('validação de veículo', () => {
  it('exige marca e modelo', () => {
    expect(
      vehicleSchema.safeParse({
        customer_id: '00000000-0000-0000-0000-000000000001',
        brand: 'Toyota',
        model: 'Corolla',
      }).success,
    ).toBe(true)

    expect(
      vehicleSchema.safeParse({
        customer_id: '00000000-0000-0000-0000-000000000001',
        brand: '',
        model: 'Corolla',
      }).success,
    ).toBe(false)
  })

  it('rejeita ano fora do intervalo plausível', () => {
    expect(
      vehicleSchema.safeParse({
        customer_id: '00000000-0000-0000-0000-000000000001',
        brand: 'VW',
        model: 'Jetta',
        year: 1500,
      }).success,
    ).toBe(false)
  })
})

describe('validação de atendimento', () => {
  const base = {
    customer_id: '00000000-0000-0000-0000-000000000001',
    date: '2026-09-03',
    start_time: '08:00',
    duration_minutes: 90,
    service_type_ids: ['00000000-0000-0000-0000-000000000002'],
  }

  it('aceita atendimento com veículo', () => {
    expect(
      orderSchema.safeParse({
        ...base,
        vehicle_id: '00000000-0000-0000-0000-000000000003',
      }).success,
    ).toBe(true)
  })

  it('aceita atendimento sem veículo quando há endereço — caso da obra', () => {
    expect(
      orderSchema.safeParse({
        ...base,
        vehicle_id: null,
        service_address: 'Av. Exemplo, 1000',
      }).success,
    ).toBe(true)
  })

  it('rejeita atendimento sem veículo e sem endereço', () => {
    expect(orderSchema.safeParse({ ...base, vehicle_id: null }).success).toBe(false)
  })

  it('exige ao menos um serviço', () => {
    expect(
      orderSchema.safeParse({
        ...base,
        vehicle_id: '00000000-0000-0000-0000-000000000003',
        service_type_ids: [],
      }).success,
    ).toBe(false)
  })

  it('rejeita duração abaixo do mínimo', () => {
    expect(
      orderSchema.safeParse({
        ...base,
        vehicle_id: '00000000-0000-0000-0000-000000000003',
        duration_minutes: 5,
      }).success,
    ).toBe(false)
  })
})
