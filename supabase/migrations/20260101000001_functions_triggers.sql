-- ============================================================
-- FilmFlow — Funcoes, triggers e automacoes de dominio
-- ============================================================

-- ------------------------------------------------------------
-- updated_at automatico
-- ------------------------------------------------------------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'organizations','locations','profiles','employees','customers',
    'vehicles','service_types','service_orders'
  ]
  loop
    execute format(
      'create trigger trg_%s_updated_at before update on %I
       for each row execute function set_updated_at()', t, t);
  end loop;
end;
$$;

-- ------------------------------------------------------------
-- Novo usuario no auth -> profile
-- ------------------------------------------------------------
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ------------------------------------------------------------
-- Helpers de tenancy usados pelas policies de RLS.
-- SECURITY DEFINER + STABLE para evitar recursao de policy
-- e permitir cache do planner dentro da mesma query.
-- ------------------------------------------------------------
create or replace function auth_org_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id
  from organization_members
  where user_id = auth.uid() and is_active
$$;

create or replace function auth_role_in(org uuid)
returns app_role
language sql
stable
security definer
set search_path = public
as $$
  select role
  from organization_members
  where user_id = auth.uid() and organization_id = org and is_active
  limit 1
$$;

create or replace function auth_is_member(org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from organization_members
    where user_id = auth.uid() and organization_id = org and is_active
  )
$$;

-- Gestao = owner ou manager. Usado nas policies de configuracao.
create or replace function auth_is_admin(org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from organization_members
    where user_id = auth.uid()
      and organization_id = org
      and is_active
      and role in ('owner','manager')
  )
$$;

-- Recepcao e acima podem operar cadastros e agenda.
create or replace function auth_can_operate(org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from organization_members
    where user_id = auth.uid()
      and organization_id = org
      and is_active
      and role in ('owner','manager','reception')
  )
$$;

-- O aplicador so pode tocar nas ordens em que esta alocado.
create or replace function auth_is_assigned(order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from service_order_employees soe
    join employees e on e.id = soe.employee_id
    where soe.service_order_id = order_id
      and e.user_id = auth.uid()
  )
$$;

-- ------------------------------------------------------------
-- Toda mudanca de status gera historico + notificacao.
-- Centralizado no banco para que qualquer cliente (web, mobile,
-- futura API) produza a mesma trilha de auditoria.
-- ------------------------------------------------------------
create or replace function handle_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_name text;
  vehicle_label text;
  notif_kind notification_kind;
  notif_title text;
begin
  if new.current_status is not distinct from old.current_status then
    return new;
  end if;

  select full_name into actor_name from profiles where id = auth.uid();
  actor_name := coalesce(actor_name, 'Sistema');

  select coalesce(v.brand || ' ' || v.model, 'Atendimento')
    into vehicle_label
  from vehicles v where v.id = new.vehicle_id;
  vehicle_label := coalesce(vehicle_label, 'Atendimento');

  new.status_changed_at := now();

  -- Carimba os marcos de execucao uma unica vez.
  if new.current_status in ('preparation','application')
     and new.actual_start is null then
    new.actual_start := now();
  end if;

  if new.current_status = 'inspection' and new.actual_end is null then
    new.actual_end := now();
  end if;

  insert into status_history (
    organization_id, service_order_id, previous_status,
    new_status, changed_by, changed_by_name
  )
  values (
    new.organization_id, new.id, old.current_status,
    new.current_status, auth.uid(), actor_name
  );

  notif_kind := case new.current_status
    when 'application' then 'order_started'::notification_kind
    when 'inspection'  then 'order_finished'::notification_kind
    when 'ready'       then 'vehicle_ready'::notification_kind
    when 'cancelled'   then 'cancelled'::notification_kind
    else null
  end;

  if notif_kind is not null then
    notif_title := case new.current_status
      when 'application' then vehicle_label || ' — serviço iniciado'
      when 'inspection'  then vehicle_label || ' — serviço concluído'
      when 'ready'       then vehicle_label || ' — pronto para entrega'
      when 'cancelled'   then vehicle_label || ' — atendimento cancelado'
    end;

    insert into notifications (
      organization_id, service_order_id, kind, title, body
    )
    values (
      new.organization_id, new.id, notif_kind, notif_title,
      actor_name || ' às ' || to_char(now() at time zone 'America/Sao_Paulo', 'HH24:MI')
    );
  end if;

  return new;
end;
$$;

create trigger trg_order_status_change
  before update of current_status on service_orders
  for each row execute function handle_status_change();

-- Primeiro registro do historico ao criar o atendimento.
create or replace function handle_order_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare actor_name text;
begin
  select full_name into actor_name from profiles where id = auth.uid();

  insert into status_history (
    organization_id, service_order_id, previous_status,
    new_status, changed_by, changed_by_name, note
  )
  values (
    new.organization_id, new.id, null, new.current_status,
    auth.uid(), coalesce(actor_name, 'Sistema'), 'Atendimento criado'
  );
  return new;
end;
$$;

create trigger trg_order_created
  after insert on service_orders
  for each row execute function handle_order_created();

-- ------------------------------------------------------------
-- Deteccao de conflito de agenda (aplicador e box).
-- Retorna as colisoes; a decisao de bloquear ou permitir
-- override e da camada de aplicacao (ver §31).
-- ------------------------------------------------------------
create or replace function check_schedule_conflicts(
  p_organization_id uuid,
  p_start timestamptz,
  p_end timestamptz,
  p_employee_ids uuid[] default '{}',
  p_workstation_id uuid default null,
  p_exclude_order_id uuid default null
)
returns table (
  conflict_type text,
  resource_id uuid,
  resource_name text,
  order_id uuid,
  conflict_start timestamptz,
  conflict_end timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  -- Conflitos de aplicador
  select
    'employee'::text,
    e.id,
    e.full_name,
    so.id,
    so.scheduled_start,
    so.scheduled_end
  from service_orders so
  join service_order_employees soe on soe.service_order_id = so.id
  join employees e on e.id = soe.employee_id
  where so.organization_id = p_organization_id
    and so.current_status not in ('cancelled','delivered','no_show')
    and (p_exclude_order_id is null or so.id <> p_exclude_order_id)
    and soe.employee_id = any(p_employee_ids)
    and tstzrange(so.scheduled_start, so.scheduled_end, '[)')
        && tstzrange(p_start, p_end, '[)')

  union all

  -- Conflitos de box
  select
    'workstation'::text,
    w.id,
    w.name,
    so.id,
    so.scheduled_start,
    so.scheduled_end
  from service_orders so
  join workstations w on w.id = so.workstation_id
  where p_workstation_id is not null
    and so.organization_id = p_organization_id
    and so.workstation_id = p_workstation_id
    and so.current_status not in ('cancelled','delivered','no_show')
    and (p_exclude_order_id is null or so.id <> p_exclude_order_id)
    and tstzrange(so.scheduled_start, so.scheduled_end, '[)')
        && tstzrange(p_start, p_end, '[)')
$$;
