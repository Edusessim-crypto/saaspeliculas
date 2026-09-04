-- ============================================================
-- FilmFlow — Schema inicial
-- Sistema operacional para lojas de aplicacao de peliculas
-- ============================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- ENUMS
-- ------------------------------------------------------------

create type app_role as enum ('owner', 'manager', 'reception', 'applicator');

create type order_status as enum (
  'scheduled',        -- Agendado
  'arrived',          -- Cliente chegou
  'waiting',          -- Aguardando inicio
  'preparation',      -- Em preparacao
  'application',      -- Em aplicacao
  'inspection',       -- Em conferencia
  'ready',            -- Pronto para entrega
  'delivered',        -- Entregue
  'cancelled',        -- Cancelado
  'no_show'           -- Nao compareceu
);

create type order_priority as enum ('normal', 'high', 'urgent');

create type service_category as enum (
  'automotive_film',
  'architectural_film',
  'ppf',
  'wrap',
  'other'
);

create type plan_tier as enum ('starter', 'pro', 'business');

create type notification_kind as enum (
  'order_started',
  'order_finished',
  'order_delayed',
  'employee_changed',
  'rescheduled',
  'cancelled',
  'vehicle_ready'
);

-- ------------------------------------------------------------
-- TENANCY
-- ------------------------------------------------------------

create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  document text,
  plan plan_tier not null default 'starter',
  -- Limites do plano. Nao ha billing no MVP, mas a estrutura ja existe.
  max_users int not null default 10,
  max_locations int not null default 1,
  timezone text not null default 'America/Sao_Paulo',
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table locations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  address text,
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_locations_org on locations(organization_id);

-- Espelha auth.users. Criado por trigger no signup.
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text,
  avatar_url text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role app_role not null default 'reception',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);
create index idx_org_members_user on organization_members(user_id);
create index idx_org_members_org on organization_members(organization_id);

-- ------------------------------------------------------------
-- EQUIPE
-- ------------------------------------------------------------

create table employees (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  location_id uuid references locations(id) on delete set null,
  -- Opcional: um aplicador pode existir sem login no sistema.
  user_id uuid references profiles(id) on delete set null,
  full_name text not null,
  role app_role not null default 'applicator',
  job_title text,
  phone text,
  avatar_url text,
  color text not null default '#2563EB',
  weekly_hours int,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_employees_org on employees(organization_id);
create index idx_employees_user on employees(user_id) where user_id is not null;
create index idx_employees_active on employees(organization_id, is_active);

create table employee_specialties (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  specialty text not null,
  unique (employee_id, specialty)
);
create index idx_emp_specialties on employee_specialties(employee_id);

-- ------------------------------------------------------------
-- BOXES / ESTACOES
-- ------------------------------------------------------------

create table workstations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  location_id uuid references locations(id) on delete cascade,
  name text not null,
  description text,
  -- null = aceita qualquer categoria
  allowed_categories service_category[],
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index idx_workstations_org on workstations(organization_id);

-- ------------------------------------------------------------
-- CLIENTES E VEICULOS
-- ------------------------------------------------------------

create table customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  phone text,
  whatsapp text,
  email text,
  document text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_customers_org on customers(organization_id);
create index idx_customers_phone on customers(organization_id, phone);
create index idx_customers_name on customers(organization_id, lower(name));

create table vehicles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  brand text not null,
  model text not null,
  version text,
  year int,
  color text,
  plate text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_vehicles_org on vehicles(organization_id);
create index idx_vehicles_customer on vehicles(customer_id);
create index idx_vehicles_plate on vehicles(organization_id, upper(plate));

-- ------------------------------------------------------------
-- SERVICOS
-- ------------------------------------------------------------

create table service_types (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  category service_category not null default 'automotive_film',
  default_duration_minutes int not null default 60,
  default_price numeric(10,2),
  default_employee_count int not null default 1,
  requires_workstation boolean not null default true,
  color text not null default '#2563EB',
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_service_types_org on service_types(organization_id, is_active);

-- ------------------------------------------------------------
-- ORDEM DE SERVICO (ATENDIMENTO) — entidade central
-- ------------------------------------------------------------

create table service_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  location_id uuid references locations(id) on delete set null,
  code serial,
  customer_id uuid not null references customers(id) on delete restrict,
  -- Nullable de proposito: servicos arquitetonicos nao tem veiculo.
  vehicle_id uuid references vehicles(id) on delete set null,
  service_address text,
  scheduled_start timestamptz not null,
  scheduled_end timestamptz not null,
  actual_start timestamptz,
  actual_end timestamptz,
  current_status order_status not null default 'scheduled',
  status_changed_at timestamptz not null default now(),
  priority order_priority not null default 'normal',
  workstation_id uuid references workstations(id) on delete set null,
  internal_notes text,
  customer_notes text,
  cancellation_reason text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_schedule_order check (scheduled_end > scheduled_start)
);
create index idx_orders_org_date on service_orders(organization_id, scheduled_start);
create index idx_orders_status on service_orders(organization_id, current_status);
create index idx_orders_customer on service_orders(customer_id);
create index idx_orders_vehicle on service_orders(vehicle_id);
create index idx_orders_workstation on service_orders(workstation_id, scheduled_start);

create table service_order_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  service_order_id uuid not null references service_orders(id) on delete cascade,
  service_type_id uuid not null references service_types(id) on delete restrict,
  -- Snapshot: o nome/preco do servico pode mudar depois; o historico nao deve.
  name_snapshot text not null,
  duration_minutes int not null,
  price numeric(10,2),
  quantity int not null default 1,
  created_at timestamptz not null default now()
);
create index idx_order_items_order on service_order_items(service_order_id);

create table service_order_employees (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  service_order_id uuid not null references service_orders(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  is_lead boolean not null default false,
  assigned_at timestamptz not null default now(),
  unique (service_order_id, employee_id)
);
create index idx_order_emp_order on service_order_employees(service_order_id);
create index idx_order_emp_employee on service_order_employees(employee_id);

-- ------------------------------------------------------------
-- HISTORICO E AUDITORIA
-- ------------------------------------------------------------

create table status_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  service_order_id uuid not null references service_orders(id) on delete cascade,
  previous_status order_status,
  new_status order_status not null,
  changed_by uuid references profiles(id) on delete set null,
  changed_by_name text,
  note text,
  changed_at timestamptz not null default now()
);
create index idx_status_history_order on status_history(service_order_id, changed_at desc);

-- Auditoria leve: apenas eventos operacionais relevantes.
create table activity_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  service_order_id uuid references service_orders(id) on delete cascade,
  actor_id uuid references profiles(id) on delete set null,
  actor_name text,
  action text not null,
  description text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);
create index idx_activity_order on activity_log(service_order_id, created_at desc);
create index idx_activity_org on activity_log(organization_id, created_at desc);

-- ------------------------------------------------------------
-- CHECKLISTS
-- ------------------------------------------------------------

create table checklist_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  category service_category,
  is_default boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index idx_checklist_templates_org on checklist_templates(organization_id);

create table checklist_items (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references checklist_templates(id) on delete cascade,
  label text not null,
  is_required boolean not null default true,
  sort_order int not null default 0
);
create index idx_checklist_items_template on checklist_items(template_id, sort_order);

create table checklist_responses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  service_order_id uuid not null references service_orders(id) on delete cascade,
  checklist_item_id uuid not null references checklist_items(id) on delete cascade,
  label_snapshot text not null,
  checked boolean not null default false,
  note text,
  responded_by uuid references profiles(id) on delete set null,
  responded_at timestamptz not null default now(),
  unique (service_order_id, checklist_item_id)
);
create index idx_checklist_responses_order on checklist_responses(service_order_id);

-- ------------------------------------------------------------
-- NOTIFICACOES
-- ------------------------------------------------------------

create table notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  -- null = para toda a organizacao (recepcao/gestao)
  user_id uuid references profiles(id) on delete cascade,
  service_order_id uuid references service_orders(id) on delete cascade,
  kind notification_kind not null,
  title text not null,
  body text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index idx_notifications_org on notifications(organization_id, created_at desc);
create index idx_notifications_unread on notifications(organization_id, read_at) where read_at is null;

-- ------------------------------------------------------------
-- HORARIO DE FUNCIONAMENTO
-- ------------------------------------------------------------

create table business_hours (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  location_id uuid references locations(id) on delete cascade,
  -- 0 = domingo ... 6 = sabado
  weekday int not null check (weekday between 0 and 6),
  is_open boolean not null default true,
  opens_at time,
  closes_at time,
  break_start time,
  break_end time,
  unique (location_id, weekday)
);
create index idx_business_hours_org on business_hours(organization_id);
