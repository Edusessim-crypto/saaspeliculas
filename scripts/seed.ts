/**
 * Seed de demonstração — FilmStar Centro Automotivo.
 *
 * Cria uma operação realista do dia atual: carros em aplicação, um pronto
 * para entrega, um agendado para a tarde e um histórico curto. O objetivo
 * é que quem abre o sistema pela primeira vez entenda o produto sem
 * cadastrar nada (§78).
 *
 * Uso: npm run db:seed
 * Exige SUPABASE_SERVICE_ROLE_KEY — roda apenas localmente, nunca no client.
 */
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import {
  DEFAULT_SERVICE_TYPES,
  DEFAULT_CHECKLIST,
  DEFAULT_HOURS,
  IDENTITY_COLORS,
} from '../src/domain/defaults'

config({ path: '.env.local' })
config({ path: '.env' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    '\n  Faltam variáveis de ambiente.\n' +
      '  Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em .env.local\n',
  )
  process.exit(1)
}

const db = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const DEMO_PASSWORD = 'filmflow123'

const DEMO_USERS = [
  { email: 'eduardo@filmstar.demo', name: 'Eduardo Costa', role: 'owner' as const },
  { email: 'mariana@filmstar.demo', name: 'Mariana Souza', role: 'reception' as const },
  { email: 'carlos@filmstar.demo', name: 'Carlos Mendes', role: 'applicator' as const },
  { email: 'lucas@filmstar.demo', name: 'Lucas Rocha', role: 'applicator' as const },
  { email: 'rafael@filmstar.demo', name: 'Rafael Lima', role: 'applicator' as const },
]

/** Instante de hoje no horário informado. */
function today(time: string): Date {
  const [h = 0, m = 0] = time.split(':').map(Number)
  const date = new Date()
  date.setHours(h, m, 0, 0)
  return date
}

function daysAgo(days: number, time: string): Date {
  const date = today(time)
  date.setDate(date.getDate() - days)
  return date
}

function minutesAgo(minutes: number): Date {
  return new Date(Date.now() - minutes * 60_000)
}

async function main() {
  console.log('\n  FilmFlow — populando dados de demonstração\n')

  // ---------------------------------------------------------------
  // Limpeza: remove a organização demo anterior, se existir.
  // ---------------------------------------------------------------
  const { data: existing } = await db
    .from('organizations')
    .select('id')
    .eq('slug', 'filmstar-demo')
    .maybeSingle()

  if (existing) {
    await db.from('organizations').delete().eq('id', existing.id)
    console.log('  ✓ Organização demo anterior removida')
  }

  // ---------------------------------------------------------------
  // Usuários de autenticação
  // ---------------------------------------------------------------
  const userIds = new Map<string, string>()

  for (const user of DEMO_USERS) {
    const { data: list } = await db.auth.admin.listUsers()
    const found = list?.users.find((u) => u.email === user.email)

    if (found) {
      userIds.set(user.email, found.id)
      await db.auth.admin.updateUserById(found.id, { password: DEMO_PASSWORD })
    } else {
      const { data, error } = await db.auth.admin.createUser({
        email: user.email,
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: user.name },
      })
      if (error) throw new Error(`Falha ao criar ${user.email}: ${error.message}`)
      userIds.set(user.email, data.user.id)
    }

    await db
      .from('profiles')
      .upsert({ id: userIds.get(user.email)!, full_name: user.name, email: user.email })
  }
  console.log(`  ✓ ${DEMO_USERS.length} usuários`)

  // ---------------------------------------------------------------
  // Organização, unidade e horários
  // ---------------------------------------------------------------
  const { data: org, error: orgError } = await db
    .from('organizations')
    .insert({
      name: 'FilmStar Centro Automotivo',
      slug: 'filmstar-demo',
      plan: 'pro',
      max_users: 25,
      onboarding_completed: true,
    })
    .select('id')
    .single()

  if (orgError || !org) throw new Error(orgError?.message ?? 'Falha ao criar organização')
  const orgId = org.id

  const { data: location } = await db
    .from('locations')
    .insert({
      organization_id: orgId,
      name: 'Unidade Centro',
      address: 'Av. Ipiranga, 1200 — Porto Alegre/RS',
      phone: '5133334444',
    })
    .select('id')
    .single()

  const locationId = location!.id

  await db.from('business_hours').insert(
    DEFAULT_HOURS.map((h) => ({
      ...h,
      organization_id: orgId,
      location_id: locationId,
      break_start: h.is_open ? '12:00' : null,
      break_end: h.is_open ? '13:00' : null,
    })),
  )

  for (const user of DEMO_USERS) {
    await db.from('organization_members').insert({
      organization_id: orgId,
      user_id: userIds.get(user.email)!,
      role: user.role,
    })
  }
  console.log('  ✓ Organização, unidade, horários e acessos')

  // ---------------------------------------------------------------
  // Equipe
  // ---------------------------------------------------------------
  const TEAM = [
    { email: 'eduardo@filmstar.demo', name: 'Eduardo Costa', role: 'manager' as const, title: 'Gerente', specialties: [] },
    { email: 'mariana@filmstar.demo', name: 'Mariana Souza', role: 'reception' as const, title: 'Recepção', specialties: [] },
    { email: 'carlos@filmstar.demo', name: 'Carlos Mendes', role: 'applicator' as const, title: 'Aplicador', specialties: ['Película automotiva', 'Acabamento'] },
    { email: 'lucas@filmstar.demo', name: 'Lucas Rocha', role: 'applicator' as const, title: 'Aplicador PPF', specialties: ['PPF', 'Envelopamento', 'Desmontagem'] },
    { email: 'rafael@filmstar.demo', name: 'Rafael Lima', role: 'applicator' as const, title: 'Aplicador', specialties: ['Película automotiva', 'Película arquitetônica'] },
  ]

  const employeeIds = new Map<string, string>()

  for (const [index, member] of TEAM.entries()) {
    const { data } = await db
      .from('employees')
      .insert({
        organization_id: orgId,
        location_id: locationId,
        user_id: userIds.get(member.email)!,
        full_name: member.name,
        role: member.role,
        job_title: member.title,
        color: IDENTITY_COLORS[index % IDENTITY_COLORS.length],
        weekly_hours: 44,
      })
      .select('id')
      .single()

    employeeIds.set(member.name, data!.id)

    if (member.specialties.length) {
      await db
        .from('employee_specialties')
        .insert(member.specialties.map((s) => ({ employee_id: data!.id, specialty: s })))
    }
  }
  console.log(`  ✓ ${TEAM.length} colaboradores`)

  // ---------------------------------------------------------------
  // Boxes
  // ---------------------------------------------------------------
  const BOXES = [
    { name: 'Box 01', description: 'Box coberto principal' },
    { name: 'Box 02', description: 'Box coberto secundário' },
    { name: 'Box PPF', description: 'Sala climatizada para PPF' },
    { name: 'Área externa', description: 'Para serviços rápidos' },
  ]

  const boxIds = new Map<string, string>()
  for (const [index, box] of BOXES.entries()) {
    const { data } = await db
      .from('workstations')
      .insert({ ...box, organization_id: orgId, location_id: locationId, sort_order: index })
      .select('id')
      .single()
    boxIds.set(box.name, data!.id)
  }
  console.log(`  ✓ ${BOXES.length} boxes`)

  // ---------------------------------------------------------------
  // Catálogo de serviços
  // ---------------------------------------------------------------
  const serviceIds = new Map<string, { id: string; duration: number }>()

  for (const [index, service] of DEFAULT_SERVICE_TYPES.entries()) {
    const { data } = await db
      .from('service_types')
      .insert({
        organization_id: orgId,
        name: service.name,
        category: service.category,
        default_duration_minutes: service.duration,
        default_employee_count: service.employees,
        requires_workstation: service.requiresWorkstation,
        color: service.color,
        default_price: PRICES[service.key] ?? null,
        sort_order: index,
      })
      .select('id')
      .single()

    serviceIds.set(service.name, { id: data!.id, duration: service.duration })
  }
  console.log(`  ✓ ${DEFAULT_SERVICE_TYPES.length} tipos de serviço`)

  // ---------------------------------------------------------------
  // Checklist padrão
  // ---------------------------------------------------------------
  const { data: template } = await db
    .from('checklist_templates')
    .insert({ organization_id: orgId, name: DEFAULT_CHECKLIST.name, is_default: true })
    .select('id')
    .single()

  const { data: checklistItems } = await db
    .from('checklist_items')
    .insert(
      DEFAULT_CHECKLIST.items.map((item, index) => ({
        template_id: template!.id,
        label: item.label,
        is_required: item.required,
        sort_order: index,
      })),
    )
    .select('id, label')

  console.log(`  ✓ Checklist com ${checklistItems?.length ?? 0} itens`)

  // ---------------------------------------------------------------
  // Clientes e veículos
  // ---------------------------------------------------------------
  const CUSTOMERS = [
    {
      name: 'João Silva',
      phone: '51999881122',
      vehicles: [{ brand: 'Toyota', model: 'Corolla', version: 'XEi', year: 2025, color: 'Prata', plate: 'JKL2A34' }],
    },
    {
      name: 'Bruno Martins',
      phone: '51988774455',
      vehicles: [{ brand: 'Volkswagen', model: 'Jetta', version: 'Comfortline', year: 2018, color: 'Preto', plate: 'ABC1D23' }],
    },
    {
      name: 'Mariana Lopes',
      phone: '51997766554',
      vehicles: [{ brand: 'Jeep', model: 'Compass', version: 'Longitude', year: 2024, color: 'Branco', plate: 'RST5F67' }],
    },
    {
      name: 'Fernanda Oliveira',
      phone: '51996655443',
      vehicles: [{ brand: 'Volkswagen', model: 'T-Cross', version: 'Highline', year: 2025, color: 'Cinza', plate: 'MNO7G89' }],
    },
    {
      name: 'Ricardo Almeida',
      phone: '51995544332',
      vehicles: [{ brand: 'Honda', model: 'Civic', version: 'Touring', year: 2022, color: 'Azul', plate: 'PQR3H45' }],
    },
    {
      name: 'Condomínio Bellagio',
      phone: '5133221100',
      vehicles: [],
    },
  ]

  const customerIds = new Map<string, string>()
  const vehicleIds = new Map<string, string>()

  for (const customer of CUSTOMERS) {
    const { data } = await db
      .from('customers')
      .insert({
        organization_id: orgId,
        name: customer.name,
        phone: customer.phone,
        whatsapp: customer.phone,
      })
      .select('id')
      .single()

    customerIds.set(customer.name, data!.id)

    for (const vehicle of customer.vehicles) {
      const { data: v } = await db
        .from('vehicles')
        .insert({ ...vehicle, organization_id: orgId, customer_id: data!.id })
        .select('id')
        .single()
      vehicleIds.set(`${customer.name}|${vehicle.model}`, v!.id)
    }
  }
  console.log(`  ✓ ${CUSTOMERS.length} clientes e veículos`)

  // ---------------------------------------------------------------
  // Atendimentos — o dia de hoje da loja
  // ---------------------------------------------------------------
  interface SeedOrder {
    customer: string
    vehicle: string | null
    services: string[]
    employees: string[]
    box: string | null
    start: Date
    durationMinutes: number
    status: string
    actualStart?: Date | null
    actualEnd?: Date | null
    address?: string
    notes?: string
    checklistDone?: boolean
  }

  const ORDERS: SeedOrder[] = [
    // Em aplicação desde as 08:14 — o cronômetro está correndo.
    {
      customer: 'João Silva',
      vehicle: 'Corolla',
      services: ['Película completa'],
      employees: ['Carlos Mendes'],
      box: 'Box 01',
      start: today('08:00'),
      durationMinutes: 90,
      status: 'application',
      actualStart: today('08:14'),
      notes: 'Cliente aguarda na recepção.',
    },
    // PPF longo, também em execução — Lucas no Box PPF.
    {
      customer: 'Bruno Martins',
      vehicle: 'Jetta',
      services: ['PPF frontal'],
      employees: ['Lucas Rocha'],
      box: 'Box PPF',
      start: today('09:30'),
      durationMinutes: 240,
      status: 'application',
      actualStart: today('09:38'),
    },
    // Já conferido e liberado: a recepção pode entregar.
    {
      customer: 'Mariana Lopes',
      vehicle: 'Compass',
      services: ['Película completa'],
      employees: ['Rafael Lima'],
      box: 'Box 02',
      start: today('10:00'),
      durationMinutes: 90,
      status: 'ready',
      actualStart: today('10:05'),
      actualEnd: today('11:28'),
      checklistDone: true,
    },
    // Aguardando conferência: o aplicador terminou há pouco.
    {
      customer: 'Ricardo Almeida',
      vehicle: 'Civic',
      services: ['Para-brisa', 'Remoção de película'],
      employees: ['Carlos Mendes'],
      box: 'Box 01',
      start: today('11:00'),
      durationMinutes: 90,
      status: 'inspection',
      actualStart: today('11:06'),
      actualEnd: minutesAgo(18),
      checklistDone: true,
    },
    // Agendado para a tarde.
    {
      customer: 'Fernanda Oliveira',
      vehicle: 'T-Cross',
      services: ['Para-brisa'],
      employees: ['Carlos Mendes'],
      box: 'Box 01',
      start: today('13:30'),
      durationMinutes: 60,
      status: 'scheduled',
    },
    // Cliente chegou, aguardando liberação para produção.
    {
      customer: 'Bruno Martins',
      vehicle: 'Jetta',
      services: ['Teto solar'],
      employees: ['Rafael Lima'],
      box: 'Box 02',
      start: today('14:00'),
      durationMinutes: 30,
      status: 'waiting',
    },
    // Serviço arquitetônico: sem veículo, com endereço (§87).
    {
      customer: 'Condomínio Bellagio',
      vehicle: null,
      services: ['Película de segurança'],
      employees: ['Rafael Lima'],
      box: null,
      start: today('16:00'),
      durationMinutes: 180,
      status: 'scheduled',
      address: 'Av. Nilo Peçanha, 2200 — Bloco B',
      notes: 'Portaria libera acesso pelo estacionamento.',
    },
    // Histórico dos dias anteriores, para os indicadores terem dados.
    {
      customer: 'João Silva',
      vehicle: 'Corolla',
      services: ['Para-brisa'],
      employees: ['Carlos Mendes'],
      box: 'Box 01',
      start: daysAgo(1, '09:00'),
      durationMinutes: 60,
      status: 'delivered',
      actualStart: daysAgo(1, '09:05'),
      actualEnd: daysAgo(1, '10:02'),
      checklistDone: true,
    },
    {
      customer: 'Mariana Lopes',
      vehicle: 'Compass',
      services: ['PPF parcial'],
      employees: ['Lucas Rocha'],
      box: 'Box PPF',
      start: daysAgo(1, '13:00'),
      durationMinutes: 180,
      status: 'delivered',
      actualStart: daysAgo(1, '13:10'),
      actualEnd: daysAgo(1, '16:25'),
      checklistDone: true,
    },
    {
      customer: 'Ricardo Almeida',
      vehicle: 'Civic',
      services: ['Película completa'],
      employees: ['Rafael Lima'],
      box: 'Box 02',
      start: daysAgo(2, '08:30'),
      durationMinutes: 90,
      status: 'delivered',
      actualStart: daysAgo(2, '08:35'),
      actualEnd: daysAgo(2, '10:12'),
      checklistDone: true,
    },
    {
      customer: 'Fernanda Oliveira',
      vehicle: 'T-Cross',
      services: ['Laterais'],
      employees: ['Carlos Mendes'],
      box: 'Box 01',
      start: daysAgo(3, '15:00'),
      durationMinutes: 45,
      status: 'delivered',
      actualStart: daysAgo(3, '15:02'),
      actualEnd: daysAgo(3, '15:51'),
      checklistDone: true,
    },
    {
      customer: 'Bruno Martins',
      vehicle: 'Jetta',
      services: ['Vidro traseiro'],
      employees: ['Rafael Lima'],
      box: 'Box 02',
      start: daysAgo(4, '10:00'),
      durationMinutes: 45,
      status: 'cancelled',
    },
  ]

  const ownerId = userIds.get('eduardo@filmstar.demo')!
  const receptionId = userIds.get('mariana@filmstar.demo')!

  for (const order of ORDERS) {
    const vehicleKey = order.vehicle ? `${order.customer}|${order.vehicle}` : null
    const end = new Date(order.start.getTime() + order.durationMinutes * 60_000)

    const { data: created, error } = await db
      .from('service_orders')
      .insert({
        organization_id: orgId,
        location_id: locationId,
        customer_id: customerIds.get(order.customer)!,
        vehicle_id: vehicleKey ? vehicleIds.get(vehicleKey) : null,
        service_address: order.address ?? null,
        scheduled_start: order.start.toISOString(),
        scheduled_end: end.toISOString(),
        actual_start: order.actualStart?.toISOString() ?? null,
        actual_end: order.actualEnd?.toISOString() ?? null,
        current_status: order.status,
        status_changed_at: (order.actualEnd ?? order.actualStart ?? order.start).toISOString(),
        workstation_id: order.box ? boxIds.get(order.box) : null,
        internal_notes: order.notes ?? null,
        cancellation_reason: order.status === 'cancelled' ? 'Cliente reagendou' : null,
        created_by: receptionId,
      })
      .select('id')
      .single()

    if (error || !created) {
      console.error(`  ! Falha em ${order.customer}: ${error?.message}`)
      continue
    }

    await db.from('service_order_items').insert(
      order.services.map((name) => {
        const service = serviceIds.get(name)!
        return {
          organization_id: orgId,
          service_order_id: created.id,
          service_type_id: service.id,
          name_snapshot: name,
          duration_minutes: service.duration,
          price: PRICES_BY_NAME[name] ?? null,
          quantity: 1,
        }
      }),
    )

    await db.from('service_order_employees').insert(
      order.employees.map((name, index) => ({
        organization_id: orgId,
        service_order_id: created.id,
        employee_id: employeeIds.get(name)!,
        is_lead: index === 0,
      })),
    )

    // Trilha de histórico coerente com o status atual.
    await seedHistory(created.id, orgId, order, receptionId, ownerId, employeeIds)

    if (order.checklistDone && checklistItems) {
      await db.from('checklist_responses').insert(
        checklistItems.map((item) => ({
          organization_id: orgId,
          service_order_id: created.id,
          checklist_item_id: item.id,
          label_snapshot: item.label,
          checked: true,
          responded_at: (order.actualEnd ?? new Date()).toISOString(),
        })),
      )
    }
  }
  console.log(`  ✓ ${ORDERS.length} atendimentos`)

  // ---------------------------------------------------------------
  // Notificações recentes para a recepção
  // ---------------------------------------------------------------
  await db.from('notifications').insert([
    {
      organization_id: orgId,
      kind: 'order_finished',
      title: 'Honda Civic — serviço concluído',
      body: 'Carlos Mendes finalizou a aplicação.',
      created_at: minutesAgo(18).toISOString(),
    },
    {
      organization_id: orgId,
      kind: 'vehicle_ready',
      title: 'Jeep Compass — pronto para entrega',
      body: 'Conferência aprovada.',
      created_at: minutesAgo(52).toISOString(),
    },
    {
      organization_id: orgId,
      kind: 'order_started',
      title: 'Volkswagen Jetta — serviço iniciado',
      body: 'Lucas Rocha às 09:38',
      read_at: minutesAgo(90).toISOString(),
      created_at: minutesAgo(140).toISOString(),
    },
  ])

  console.log('\n  Pronto. Acesse com qualquer um destes usuários:\n')
  for (const user of DEMO_USERS) {
    console.log(`    ${user.email.padEnd(28)} ${DEMO_PASSWORD}   (${user.role})`)
  }
  console.log('')
}

/** Reconstroi o histórico de status coerente com o estado final. */
async function seedHistory(
  orderId: string,
  orgId: string,
  order: { status: string; start: Date; actualStart?: Date | null; actualEnd?: Date | null },
  receptionId: string,
  ownerId: string,
  employeeIds: Map<string, string>,
) {
  void employeeIds
  const entries: {
    previous: string | null
    next: string
    at: Date
    by: string
    name: string
  }[] = []

  const created = new Date(order.start.getTime() - 3 * 86_400_000)
  entries.push({ previous: null, next: 'scheduled', at: created, by: receptionId, name: 'Mariana Souza' })

  const flow = ['arrived', 'waiting', 'preparation', 'application', 'inspection', 'ready', 'delivered']
  const targetIndex = flow.indexOf(order.status)

  if (order.status === 'cancelled') {
    entries.push({
      previous: 'scheduled',
      next: 'cancelled',
      at: new Date(order.start.getTime() - 3600_000),
      by: receptionId,
      name: 'Mariana Souza',
    })
  } else if (targetIndex >= 0) {
    const base = order.actualStart ?? order.start
    const offsets = [-12, -6, -2, 0, 0, 0, 0]

    for (let i = 0; i <= targetIndex; i++) {
      const status = flow[i]!
      let at: Date

      if (status === 'inspection') at = order.actualEnd ?? base
      else if (status === 'ready') at = new Date((order.actualEnd ?? base).getTime() + 8 * 60_000)
      else if (status === 'delivered') at = new Date((order.actualEnd ?? base).getTime() + 25 * 60_000)
      else at = new Date(base.getTime() + (offsets[i] ?? 0) * 60_000)

      const isApplicatorStep = ['preparation', 'application', 'inspection'].includes(status)

      entries.push({
        previous: i === 0 ? 'scheduled' : flow[i - 1]!,
        next: status,
        at,
        by: isApplicatorStep ? ownerId : receptionId,
        name: isApplicatorStep ? 'Carlos Mendes' : 'Mariana Souza',
      })
    }
  }

  await db.from('status_history').insert(
    entries.map((entry) => ({
      organization_id: orgId,
      service_order_id: orderId,
      previous_status: entry.previous,
      new_status: entry.next,
      changed_by: entry.by,
      changed_by_name: entry.name,
      changed_at: entry.at.toISOString(),
    })),
  )
}

const PRICES: Record<string, number> = {
  'film-full': 1250,
  'film-windshield': 480,
  'film-sides': 620,
  'film-rear': 390,
  'film-sunroof': 320,
  'ppf-front': 4800,
  'ppf-partial': 3200,
  'ppf-full': 12500,
  'ppf-piece': 900,
  'arch-residential': 2800,
  'arch-commercial': 4500,
  'arch-security': 5200,
  'arch-solar': 2200,
  wrap: 8500,
  removal: 380,
  rework: 0,
}

const PRICES_BY_NAME: Record<string, number> = Object.fromEntries(
  DEFAULT_SERVICE_TYPES.map((s) => [s.name, PRICES[s.key] ?? 0]),
)

main().catch((error) => {
  console.error('\n  Falha no seed:', error instanceof Error ? error.message : error, '\n')
  process.exit(1)
})
