-- ============================================================
-- FilmFlow — Row Level Security
-- Regra base: nenhuma linha operacional e visivel fora da
-- organizacao do usuario. Aplicador tem escopo reduzido.
-- ============================================================

alter table organizations         enable row level security;
alter table locations             enable row level security;
alter table profiles              enable row level security;
alter table organization_members  enable row level security;
alter table employees             enable row level security;
alter table employee_specialties  enable row level security;
alter table workstations          enable row level security;
alter table customers             enable row level security;
alter table vehicles              enable row level security;
alter table service_types         enable row level security;
alter table service_orders        enable row level security;
alter table service_order_items   enable row level security;
alter table service_order_employees enable row level security;
alter table status_history        enable row level security;
alter table activity_log          enable row level security;
alter table checklist_templates   enable row level security;
alter table checklist_items       enable row level security;
alter table checklist_responses   enable row level security;
alter table notifications         enable row level security;
alter table business_hours        enable row level security;

-- ------------------------------------------------------------
-- PROFILES
-- ------------------------------------------------------------
create policy profiles_select on profiles for select
  using (
    id = auth.uid()
    or exists (
      select 1 from organization_members m1
      join organization_members m2 on m1.organization_id = m2.organization_id
      where m1.user_id = auth.uid() and m2.user_id = profiles.id
    )
  );

create policy profiles_update_self on profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

-- ------------------------------------------------------------
-- ORGANIZATIONS / LOCATIONS / MEMBERS
-- ------------------------------------------------------------
create policy orgs_select on organizations for select
  using (auth_is_member(id));

create policy orgs_insert on organizations for insert
  with check (auth.uid() is not null);

create policy orgs_update on organizations for update
  using (auth_is_admin(id)) with check (auth_is_admin(id));

create policy locations_select on locations for select
  using (auth_is_member(organization_id));

create policy locations_write on locations for all
  using (auth_is_admin(organization_id))
  with check (auth_is_admin(organization_id));

create policy members_select on organization_members for select
  using (user_id = auth.uid() or auth_is_member(organization_id));

-- Permite o proprio usuario criar seu vinculo inicial no onboarding.
create policy members_insert on organization_members for insert
  with check (user_id = auth.uid() or auth_is_admin(organization_id));

create policy members_update on organization_members for update
  using (auth_is_admin(organization_id))
  with check (auth_is_admin(organization_id));

create policy members_delete on organization_members for delete
  using (auth_is_admin(organization_id));

-- ------------------------------------------------------------
-- CONFIGURACAO (gestao escreve, todos leem)
-- ------------------------------------------------------------
create policy employees_select on employees for select
  using (auth_is_member(organization_id));
create policy employees_write on employees for all
  using (auth_is_admin(organization_id))
  with check (auth_is_admin(organization_id));

create policy emp_spec_select on employee_specialties for select
  using (exists (
    select 1 from employees e
    where e.id = employee_id and auth_is_member(e.organization_id)
  ));
create policy emp_spec_write on employee_specialties for all
  using (exists (
    select 1 from employees e
    where e.id = employee_id and auth_is_admin(e.organization_id)
  ))
  with check (exists (
    select 1 from employees e
    where e.id = employee_id and auth_is_admin(e.organization_id)
  ));

create policy workstations_select on workstations for select
  using (auth_is_member(organization_id));
create policy workstations_write on workstations for all
  using (auth_is_admin(organization_id))
  with check (auth_is_admin(organization_id));

create policy service_types_select on service_types for select
  using (auth_is_member(organization_id));
create policy service_types_write on service_types for all
  using (auth_is_admin(organization_id))
  with check (auth_is_admin(organization_id));

create policy business_hours_select on business_hours for select
  using (auth_is_member(organization_id));
create policy business_hours_write on business_hours for all
  using (auth_is_admin(organization_id))
  with check (auth_is_admin(organization_id));

create policy checklist_tpl_select on checklist_templates for select
  using (auth_is_member(organization_id));
create policy checklist_tpl_write on checklist_templates for all
  using (auth_is_admin(organization_id))
  with check (auth_is_admin(organization_id));

create policy checklist_items_select on checklist_items for select
  using (exists (
    select 1 from checklist_templates t
    where t.id = template_id and auth_is_member(t.organization_id)
  ));
create policy checklist_items_write on checklist_items for all
  using (exists (
    select 1 from checklist_templates t
    where t.id = template_id and auth_is_admin(t.organization_id)
  ))
  with check (exists (
    select 1 from checklist_templates t
    where t.id = template_id and auth_is_admin(t.organization_id)
  ));

-- ------------------------------------------------------------
-- CADASTROS OPERACIONAIS
-- Aplicador le (precisa ver o cliente do servico dele) mas nao escreve.
-- ------------------------------------------------------------
create policy customers_select on customers for select
  using (auth_is_member(organization_id));
create policy customers_write on customers for all
  using (auth_can_operate(organization_id))
  with check (auth_can_operate(organization_id));

create policy vehicles_select on vehicles for select
  using (auth_is_member(organization_id));
create policy vehicles_write on vehicles for all
  using (auth_can_operate(organization_id))
  with check (auth_can_operate(organization_id));

-- ------------------------------------------------------------
-- ATENDIMENTOS
-- Aplicador ve apenas as ordens em que esta alocado e so pode
-- alterar status (nao pode reagendar nem trocar cliente).
-- ------------------------------------------------------------
create policy orders_select on service_orders for select
  using (
    auth_is_member(organization_id)
    and (auth_can_operate(organization_id) or auth_is_assigned(id))
  );

create policy orders_insert on service_orders for insert
  with check (auth_can_operate(organization_id));

create policy orders_update on service_orders for update
  using (
    auth_can_operate(organization_id)
    or (auth_is_member(organization_id) and auth_is_assigned(id))
  )
  with check (
    auth_can_operate(organization_id)
    or (auth_is_member(organization_id) and auth_is_assigned(id))
  );

create policy orders_delete on service_orders for delete
  using (auth_is_admin(organization_id));

create policy order_items_select on service_order_items for select
  using (
    auth_is_member(organization_id)
    and (auth_can_operate(organization_id) or auth_is_assigned(service_order_id))
  );
create policy order_items_write on service_order_items for all
  using (auth_can_operate(organization_id))
  with check (auth_can_operate(organization_id));

create policy order_emp_select on service_order_employees for select
  using (auth_is_member(organization_id));
create policy order_emp_write on service_order_employees for all
  using (auth_can_operate(organization_id))
  with check (auth_can_operate(organization_id));

-- ------------------------------------------------------------
-- HISTORICO — imutavel do lado do cliente (so o trigger insere)
-- ------------------------------------------------------------
create policy status_history_select on status_history for select
  using (auth_is_member(organization_id));

create policy activity_select on activity_log for select
  using (auth_is_member(organization_id));
create policy activity_insert on activity_log for insert
  with check (auth_is_member(organization_id));

-- ------------------------------------------------------------
-- CHECKLIST — o aplicador alocado preenche
-- ------------------------------------------------------------
create policy checklist_resp_select on checklist_responses for select
  using (auth_is_member(organization_id));

create policy checklist_resp_write on checklist_responses for all
  using (
    auth_can_operate(organization_id)
    or (auth_is_member(organization_id) and auth_is_assigned(service_order_id))
  )
  with check (
    auth_can_operate(organization_id)
    or (auth_is_member(organization_id) and auth_is_assigned(service_order_id))
  );

-- ------------------------------------------------------------
-- NOTIFICACOES
-- ------------------------------------------------------------
create policy notifications_select on notifications for select
  using (
    auth_is_member(organization_id)
    and (user_id is null or user_id = auth.uid())
  );

create policy notifications_update on notifications for update
  using (
    auth_is_member(organization_id)
    and (user_id is null or user_id = auth.uid())
  )
  with check (
    auth_is_member(organization_id)
    and (user_id is null or user_id = auth.uid())
  );

create policy notifications_insert on notifications for insert
  with check (auth_is_member(organization_id));

-- ------------------------------------------------------------
-- REALTIME
-- Publica apenas o necessario para a sincronizacao operacional.
-- ------------------------------------------------------------
alter publication supabase_realtime add table service_orders;
alter publication supabase_realtime add table service_order_employees;
alter publication supabase_realtime add table status_history;
alter publication supabase_realtime add table notifications;
