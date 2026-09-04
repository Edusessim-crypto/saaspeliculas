import { z } from 'zod'

const digits = (v: string) => v.replace(/\D/g, '')

export const phoneSchema = z
  .string()
  .trim()
  .refine((v) => v === '' || digits(v).length >= 10, 'Telefone incompleto')
  .transform((v) => (v === '' ? null : digits(v)))
  .nullable()

export const plateSchema = z
  .string()
  .trim()
  .transform((v) => v.toUpperCase().replace(/[^A-Z0-9]/g, ''))
  .refine((v) => v === '' || /^[A-Z]{3}\d[A-Z0-9]\d{2}$/.test(v), 'Placa inválida')
  .transform((v) => (v === '' ? null : v))
  .nullable()

export const optionalText = z
  .string()
  .trim()
  .transform((v) => (v === '' ? null : v))
  .nullable()

export const customerSchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome do cliente'),
  phone: phoneSchema.optional().default(null),
  whatsapp: phoneSchema.optional().default(null),
  email: z
    .string()
    .trim()
    .refine((v) => v === '' || z.string().email().safeParse(v).success, 'E-mail inválido')
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .optional()
    .default(null),
  document: optionalText.optional().default(null),
  notes: optionalText.optional().default(null),
})

export const vehicleSchema = z.object({
  customer_id: z.string().uuid('Selecione o cliente'),
  brand: z.string().trim().min(1, 'Informe a marca'),
  model: z.string().trim().min(1, 'Informe o modelo'),
  version: optionalText.optional().default(null),
  year: z
    .union([z.number(), z.string()])
    .transform((v) => {
      const n = typeof v === 'string' ? parseInt(v, 10) : v
      return Number.isFinite(n) ? n : null
    })
    .refine((v) => v === null || (v >= 1900 && v <= 2100), 'Ano inválido')
    .nullable()
    .optional()
    .default(null),
  color: optionalText.optional().default(null),
  plate: plateSchema.optional().default(null),
  notes: optionalText.optional().default(null),
})

export const orderSchema = z
  .object({
    customer_id: z.string().uuid('Selecione o cliente'),
    vehicle_id: z.string().uuid().nullable().optional().default(null),
    service_address: optionalText.optional().default(null),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
    start_time: z.string().regex(/^\d{2}:\d{2}$/, 'Horário inválido'),
    duration_minutes: z.number().int().min(15, 'Duração mínima de 15 minutos'),
    service_type_ids: z.array(z.string().uuid()).min(1, 'Selecione ao menos um serviço'),
    employee_ids: z.array(z.string().uuid()).default([]),
    workstation_id: z.string().uuid().nullable().optional().default(null),
    priority: z.enum(['normal', 'high', 'urgent']).default('normal'),
    internal_notes: optionalText.optional().default(null),
    customer_notes: optionalText.optional().default(null),
    force_conflict: z.boolean().default(false),
  })
  // Atendimento sem veiculo precisa de endereco — e o caso da obra
  // arquitetonica, que o schema ja suporta (§87).
  .refine((v) => v.vehicle_id !== null || v.service_address !== null, {
    message: 'Informe o veículo ou o endereço do serviço',
    path: ['vehicle_id'],
  })

export const employeeSchema = z.object({
  full_name: z.string().trim().min(2, 'Informe o nome'),
  role: z.enum(['owner', 'manager', 'reception', 'applicator']).default('applicator'),
  job_title: optionalText.optional().default(null),
  phone: phoneSchema.optional().default(null),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor inválida').default('#2563EB'),
  weekly_hours: z.number().int().min(0).max(80).nullable().optional().default(null),
  specialties: z.array(z.string()).default([]),
  is_active: z.boolean().default(true),
})

export const serviceTypeSchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome do serviço'),
  category: z.enum(['automotive_film', 'architectural_film', 'ppf', 'wrap', 'other']),
  default_duration_minutes: z.number().int().min(15, 'Mínimo de 15 minutos').max(1440),
  default_price: z.number().min(0).nullable().optional().default(null),
  default_employee_count: z.number().int().min(1).max(10).default(1),
  requires_workstation: z.boolean().default(true),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#2563EB'),
  is_active: z.boolean().default(true),
})

export const workstationSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome do box'),
  description: optionalText.optional().default(null),
  allowed_categories: z
    .array(z.enum(['automotive_film', 'architectural_film', 'ppf', 'wrap', 'other']))
    .nullable()
    .optional()
    .default(null),
  is_active: z.boolean().default(true),
})

export type CustomerInput = z.input<typeof customerSchema>
export type VehicleInput = z.input<typeof vehicleSchema>
export type OrderInput = z.input<typeof orderSchema>
export type EmployeeInput = z.input<typeof employeeSchema>
export type ServiceTypeInput = z.input<typeof serviceTypeSchema>
export type WorkstationInput = z.input<typeof workstationSchema>
