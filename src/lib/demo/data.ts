/**
 * Dados de demonstracao em memoria.
 *
 * Existe para conseguir navegar e apresentar o produto sem nenhum banco —
 * o projeto Supabase foi removido e recria-lo depende de infraestrutura
 * externa. Espelha o mesmo cenario de `scripts/seed.ts`: a FilmStar num dia
 * normal de operacao.
 *
 * Ativado por NEXT_PUBLIC_DEMO_MODE=true; sem a flag nada aqui e usado.
 */
import type {
  Organization, Location, Profile, Employee, Customer, Vehicle, ServiceType,
  Workstation, ServiceOrderView, BusinessHours, AppNotification,
  StatusHistoryEntry, SessionContext,
} from '@/types/database'
import type { OrderStatus } from '@/domain/status'
import type { AppRole } from '@/domain/roles'

const ORG_ID = 'demo-org-0000-0000-0000-000000000001'
const LOC_ID = 'demo-loc-0000-0000-0000-000000000001'
const iso = (d: Date) => d.toISOString()

/** Hoje as HH:MM no fuso local — mantem a demo sempre "no dia de hoje". */
function at(hour: number, minute = 0): Date {
  const d = new Date()
  d.setHours(hour, minute, 0, 0)
  return d
}
const minutesAgo = (n: number) => iso(new Date(Date.now() - n * 60_000))

const stamp = { created_at: iso(new Date()), updated_at: iso(new Date()) }

export const demoOrganization: Organization = {
  id: ORG_ID,
  name: 'FilmStar Centro Automotivo',
  slug: 'filmstar',
  document: null,
  plan: 'pro',
  max_users: 10,
  max_locations: 2,
  timezone: 'America/Sao_Paulo',
  onboarding_completed: true,
  ...stamp,
}

export const demoLocation: Location = {
  id: LOC_ID,
  organization_id: ORG_ID,
  name: 'Unidade Centro',
  address: 'Av. Assis Brasil, 1420 — Porto Alegre/RS',
  phone: '(51) 3333-4444',
  is_active: true,
  ...stamp,
}

interface DemoUser {
  email: string
  name: string
  role: AppRole
  title: string
  color: string
}

const USERS: DemoUser[] = [
  { email: 'eduardo@filmstar.demo', name: 'Eduardo Costa', role: 'owner', title: 'Proprietário', color: '#172554' },
  { email: 'mariana@filmstar.demo', name: 'Mariana Souza', role: 'reception', title: 'Recepção', color: '#7c3aed' },
  { email: 'carlos@filmstar.demo', name: 'Carlos Mendes', role: 'applicator', title: 'Aplicador', color: '#0d9488' },
  { email: 'lucas@filmstar.demo', name: 'Lucas Rocha', role: 'applicator', title: 'Aplicador PPF', color: '#db2777' },
  { email: 'rafael@filmstar.demo', name: 'Rafael Lima', role: 'applicator', title: 'Aplicador', color: '#ea580c' },
]

const userId = (email: string) => `demo-user-${email.split('@')[0]}`
const employeeId = (email: string) => `demo-emp-${email.split('@')[0]}`

export const demoEmployees: Employee[] = USERS.map((u, i) => ({
  id: employeeId(u.email),
  organization_id: ORG_ID,
  location_id: LOC_ID,
  user_id: userId(u.email),
  full_name: u.name,
  role: u.role,
  job_title: u.title,
  phone: `(51) 9${8000 + i}-${1000 + i * 7}`,
  avatar_url: null,
  color: u.color,
  weekly_hours: 44,
  is_active: true,
  ...stamp,
}))

export const demoProfiles: Profile[] = USERS.map((u) => ({
  id: userId(u.email),
  full_name: u.name,
  email: u.email,
  avatar_url: null,
  phone: null,
  ...stamp,
}))

export const demoWorkstations: Workstation[] = [
  { name: 'Box 01', description: 'Box coberto principal' },
  { name: 'Box 02', description: 'Box coberto secundário' },
  { name: 'Box PPF', description: 'Sala climatizada para PPF' },
  { name: 'Área externa', description: 'Para serviços rápidos' },
].map((w, i) => ({
  id: `demo-ws-${i + 1}`,
  organization_id: ORG_ID,
  location_id: LOC_ID,
  name: w.name,
  description: w.description,
  allowed_categories: null,
  is_active: true,
  sort_order: i,
  ...stamp,
}))

const SERVICES: Array<[string, ServiceType['category'], number, number, string]> = [
  ['Película completa', 'automotive_film', 90, 890, '#2563eb'],
  ['Para-brisa', 'automotive_film', 45, 380, '#3b82f6'],
  ['Laterais', 'automotive_film', 60, 520, '#60a5fa'],
  ['Vidro traseiro', 'automotive_film', 40, 340, '#93c5fd'],
  ['Teto solar', 'automotive_film', 30, 260, '#1d4ed8'],
  ['PPF frontal', 'ppf', 240, 3200, '#7c3aed'],
  ['PPF parcial', 'ppf', 360, 5400, '#8b5cf6'],
  ['PPF completo', 'ppf', 600, 12000, '#6d28d9'],
  ['PPF peça individual', 'ppf', 120, 1400, '#a78bfa'],
  ['Película residencial', 'architectural_film', 180, 1800, '#0d9488'],
  ['Película comercial', 'architectural_film', 240, 2600, '#14b8a6'],
  ['Película de segurança', 'architectural_film', 180, 2200, '#0f766e'],
  ['Controle solar', 'architectural_film', 150, 1600, '#2dd4bf'],
  ['Envelopamento', 'wrap', 480, 6500, '#ea580c'],
  ['Remoção de película', 'other', 60, 250, '#64748b'],
  ['Retrabalho', 'other', 60, 0, '#94a3b8'],
]

export const demoServiceTypes: ServiceType[] = SERVICES.map(([name, category, dur, price, color], i) => ({
  id: `demo-st-${i + 1}`,
  organization_id: ORG_ID,
  name,
  category,
  default_duration_minutes: dur,
  default_price: price || null,
  default_employee_count: category === 'ppf' ? 2 : 1,
  requires_workstation: category !== 'architectural_film',
  color,
  is_active: true,
  sort_order: i,
  ...stamp,
}))

const CUSTOMERS: Array<{
  name: string
  phone: string
  vehicle?: { brand: string; model: string; version: string; year: number; color: string; plate: string }
}> = [
  { name: 'João Silva', phone: '51991112233', vehicle: { brand: 'Toyota', model: 'Corolla', version: 'XEi', year: 2025, color: 'Prata', plate: 'JKL2A34' } },
  { name: 'Bruno Martins', phone: '51992223344', vehicle: { brand: 'Volkswagen', model: 'Jetta', version: 'Comfortline', year: 2018, color: 'Preto', plate: 'ABC1D23' } },
  { name: 'Mariana Lopes', phone: '51993334455', vehicle: { brand: 'Jeep', model: 'Compass', version: 'Longitude', year: 2024, color: 'Branco', plate: 'RST5F67' } },
  { name: 'Fernanda Oliveira', phone: '51994445566', vehicle: { brand: 'Volkswagen', model: 'T-Cross', version: 'Highline', year: 2025, color: 'Cinza', plate: 'MNO7G89' } },
  { name: 'Ricardo Almeida', phone: '51995556677', vehicle: { brand: 'Honda', model: 'Civic', version: 'Touring', year: 2022, color: 'Azul', plate: 'PQR3H45' } },
  { name: 'Condomínio Bellagio', phone: '51996667788' },
]

export const demoCustomers: Customer[] = CUSTOMERS.map((c, i) => ({
  id: `demo-cust-${i + 1}`,
  organization_id: ORG_ID,
  name: c.name,
  phone: c.phone,
  whatsapp: c.phone,
  email: null,
  document: null,
  notes: null,
  ...stamp,
}))

export const demoVehicles: Vehicle[] = CUSTOMERS.flatMap((c, i) =>
  c.vehicle
    ? [{
        id: `demo-veh-${i + 1}`,
        organization_id: ORG_ID,
        customer_id: `demo-cust-${i + 1}`,
        brand: c.vehicle.brand,
        model: c.vehicle.model,
        version: c.vehicle.version,
        year: c.vehicle.year,
        color: c.vehicle.color,
        plate: c.vehicle.plate,
        notes: null,
        ...stamp,
      }]
    : [],
)

export const demoBusinessHours: BusinessHours[] = [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
  id: `demo-bh-${weekday}`,
  organization_id: ORG_ID,
  location_id: LOC_ID,
  weekday,
  is_open: weekday !== 0,
  opens_at: weekday === 0 ? null : '08:00',
  closes_at: weekday === 0 ? null : weekday === 6 ? '12:00' : '18:00',
  break_start: weekday >= 1 && weekday <= 5 ? '12:00' : null,
  break_end: weekday >= 1 && weekday <= 5 ? '13:00' : null,
}))

interface OrderSeed {
  code: number
  customer: number
  service: number[]
  employees: string[]
  workstation: number | null
  start: Date
  durationMin: number
  status: OrderStatus
  runningForMin?: number
  address?: string
}

// Um dia realista: entregas pela manha, producao rolando agora e
// agendamentos a frente — o cenario que o §149 pede.
const ORDERS: OrderSeed[] = [
  { code: 1, customer: 0, service: [0], employees: ['carlos'], workstation: 0, start: at(8, 0), durationMin: 90, status: 'delivered' },
  { code: 2, customer: 4, service: [1, 14], employees: ['carlos'], workstation: 0, start: at(9, 30), durationMin: 105, status: 'ready' },
  { code: 3, customer: 2, service: [0], employees: ['rafael'], workstation: 1, start: at(10, 0), durationMin: 90, status: 'ready' },
  { code: 4, customer: 1, service: [5], employees: ['lucas'], workstation: 2, start: at(9, 0), durationMin: 240, status: 'application', runningForMin: 96 },
  { code: 5, customer: 3, service: [2], employees: ['carlos'], workstation: 0, start: at(13, 30), durationMin: 60, status: 'application', runningForMin: 34 },
  { code: 6, customer: 2, service: [4], employees: ['rafael'], workstation: 1, start: at(14, 0), durationMin: 30, status: 'preparation', runningForMin: 12 },
  { code: 7, customer: 0, service: [3], employees: ['carlos'], workstation: 3, start: at(15, 0), durationMin: 40, status: 'waiting' },
  { code: 8, customer: 4, service: [1], employees: [], workstation: null, start: at(15, 30), durationMin: 45, status: 'arrived' },
  { code: 9, customer: 5, service: [11], employees: ['rafael'], workstation: null, start: at(16, 0), durationMin: 180, status: 'scheduled', address: 'Av. Nilo Peçanha, 2400 — Torre B' },
  { code: 10, customer: 3, service: [0], employees: ['lucas'], workstation: 2, start: at(16, 30), durationMin: 90, status: 'scheduled' },
  { code: 11, customer: 1, service: [13], employees: ['lucas'], workstation: 2, start: at(17, 0), durationMin: 480, status: 'scheduled' },
  { code: 12, customer: 0, service: [0, 14], employees: [], workstation: null, start: at(11, 0), durationMin: 150, status: 'no_show' },
]

export const demoOrders: ServiceOrderView[] = ORDERS.map((o) => {
  const customer = demoCustomers[o.customer]!
  const vehicle = demoVehicles.find((v) => v.customer_id === customer.id) ?? null
  const services = o.service.map((i) => demoServiceTypes[i]!)
  const end = new Date(o.start.getTime() + o.durationMin * 60_000)
  const started = o.runningForMin ? minutesAgo(o.runningForMin) : null
  const finished = ['ready', 'delivered'].includes(o.status) ? iso(end) : null
  const ws = o.workstation !== null ? demoWorkstations[o.workstation]! : null

  return {
    id: `demo-order-${o.code}`,
    organization_id: ORG_ID,
    location_id: LOC_ID,
    code: o.code,
    customer_id: customer.id,
    vehicle_id: o.address ? null : (vehicle?.id ?? null),
    service_address: o.address ?? null,
    scheduled_start: iso(o.start),
    scheduled_end: iso(end),
    actual_start: started ?? (finished ? iso(o.start) : null),
    actual_end: finished,
    current_status: o.status,
    status_changed_at: started ?? iso(o.start),
    priority: o.code === 4 ? 'high' : 'normal',
    workstation_id: ws?.id ?? null,
    internal_notes: o.code === 4 ? 'Cliente pediu atenção extra nas bordas do capô.' : null,
    customer_notes: null,
    cancellation_reason: null,
    created_by: userId('mariana@filmstar.demo'),
    ...stamp,
    customer: { id: customer.id, name: customer.name, phone: customer.phone, whatsapp: customer.whatsapp },
    vehicle: o.address || !vehicle ? null : { id: vehicle.id, brand: vehicle.brand, model: vehicle.model, year: vehicle.year, color: vehicle.color, plate: vehicle.plate },
    workstation: ws ? { id: ws.id, name: ws.name } : null,
    items: services.map((s, i) => ({
      id: `demo-item-${o.code}-${i}`,
      name_snapshot: s.name,
      duration_minutes: s.default_duration_minutes,
      price: s.default_price,
      quantity: 1,
    })),
    employees: o.employees.map((slug, i) => {
      const emp = demoEmployees.find((e) => e.id === `demo-emp-${slug}`)!
      return {
        employee_id: emp.id,
        full_name: emp.full_name,
        color: emp.color,
        avatar_url: null,
        is_lead: i === 0,
      }
    }),
  }
})

export const demoNotifications: AppNotification[] = [
  { kind: 'order_finished' as const, title: 'Serviço concluído', body: 'Rafael finalizou Película completa — Jeep Compass', min: 12 },
  { kind: 'vehicle_ready' as const, title: 'Veículo pronto para entrega', body: 'Honda Civic — Ricardo Almeida', min: 28 },
  { kind: 'order_started' as const, title: 'Serviço iniciado', body: 'Lucas iniciou PPF frontal — Volkswagen Jetta', min: 96 },
].map((n, i) => ({
  id: `demo-notif-${i + 1}`,
  organization_id: ORG_ID,
  user_id: null,
  service_order_id: null,
  kind: n.kind,
  title: n.title,
  body: n.body,
  read_at: null,
  created_at: minutesAgo(n.min),
}))

export function demoHistoryFor(orderId: string): StatusHistoryEntry[] {
  const order = demoOrders.find((o) => o.id === orderId)
  if (!order) return []
  const sequence: OrderStatus[] = ['scheduled', 'arrived', 'waiting', 'preparation', 'application', 'inspection', 'ready', 'delivered']
  const upTo = sequence.indexOf(order.current_status)
  if (upTo < 0) return []
  const base = new Date(order.scheduled_start).getTime()
  return sequence
    .slice(0, upTo + 1)
    .map((status, i) => ({
      id: `demo-hist-${orderId}-${i}`,
      organization_id: ORG_ID,
      service_order_id: orderId,
      previous_status: i === 0 ? null : sequence[i - 1]!,
      new_status: status,
      changed_by: userId('mariana@filmstar.demo'),
      changed_by_name: i >= 3 && i <= 5 ? 'Carlos Mendes' : 'Mariana Souza',
      note: null,
      changed_at: iso(new Date(base + i * 11 * 60_000)),
    }))
    .reverse()
}

/** Sessao falsa; o papel vem do cookie `demo_role` escolhido no login. */
export function demoSession(role: AppRole = 'owner'): SessionContext {
  const user = USERS.find((u) => u.role === role) ?? USERS[0]!
  return {
    userId: userId(user.email),
    profile: demoProfiles.find((p) => p.id === userId(user.email))!,
    organization: demoOrganization,
    role,
    employeeId: employeeId(user.email),
    locationId: LOC_ID,
  }
}

export const DEMO_USERS = USERS.map((u) => ({ email: u.email, name: u.name, role: u.role }))
