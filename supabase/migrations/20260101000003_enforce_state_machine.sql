-- Aplica a state machine no banco.
--
-- Ate aqui o grafo de transicoes vivia apenas em src/domain/state-machine.ts,
-- entao um UPDATE direto (PostgREST, SQL Editor, cliente proprio) pulava de
-- 'scheduled' para 'delivered' e atropelava toda a operacao. O RLS controlava
-- QUEM atualiza, nao PARA QUAL estado.
--
-- Este grafo espelha TRANSITIONS em src/domain/state-machine.ts — os dois
-- precisam mudar juntos.

create or replace function order_status_can_transition(
  from_status order_status,
  to_status order_status
) returns boolean
language sql
immutable
as $$
  select case from_status
    when 'scheduled'   then to_status in ('arrived','cancelled','no_show')
    when 'arrived'     then to_status in ('waiting','scheduled','cancelled')
    when 'waiting'     then to_status in ('preparation','application','arrived','cancelled')
    when 'preparation' then to_status in ('application','waiting','cancelled')
    when 'application' then to_status in ('inspection','preparation','cancelled')
    when 'inspection'  then to_status in ('ready','application','cancelled')
    when 'ready'       then to_status in ('delivered','inspection')
    else false
  end;
$$;

comment on function order_status_can_transition is
  'Espelha TRANSITIONS de src/domain/state-machine.ts. Estados terminais '
  '(delivered, cancelled, no_show) so saem por reabertura explicita.';

-- Reabertura explicita: unica saida de um estado terminal, restrita a quem
-- tem o papel adequado. Equivale a `reopen()` do dominio.
create or replace function reopen_service_order(
  order_id uuid,
  target_status order_status default 'waiting',
  reason text default null
) returns service_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  current_order service_orders;
  updated_order service_orders;
begin
  select * into current_order from service_orders where id = order_id;
  if not found then
    raise exception 'Atendimento nao encontrado';
  end if;

  if not auth_role_in(current_order.organization_id, array['owner','manager']::app_role[]) then
    raise exception 'Sem permissao para reabrir atendimento'
      using errcode = '42501';
  end if;

  if current_order.current_status not in ('delivered','cancelled','no_show') then
    raise exception 'Atendimento nao esta em estado terminal (atual: %)',
      current_order.current_status using errcode = 'check_violation';
  end if;

  if target_status in ('delivered','cancelled','no_show') then
    raise exception 'Reabertura deve mirar um estado operacional'
      using errcode = 'check_violation';
  end if;

  update service_orders
     set current_status = target_status,
         actual_end = null,
         reopen_note = coalesce(reason, 'Reaberto')
   where id = order_id
   returning * into updated_order;

  return updated_order;
end;
$$;

alter table service_orders
  add column if not exists reopen_note text;

-- A validacao roda antes de handle_status_change para que uma transicao
-- invalida nao chegue a gravar historico nem disparar notificacao.
create or replace function validate_status_transition()
returns trigger
language plpgsql
as $$
begin
  if new.current_status is not distinct from old.current_status then
    return new;
  end if;

  -- Reabertura passa por reopen_service_order(), que sinaliza via reopen_note.
  if old.current_status in ('delivered','cancelled','no_show')
     and new.reopen_note is distinct from old.reopen_note then
    return new;
  end if;

  if not order_status_can_transition(old.current_status, new.current_status) then
    raise exception 'Transicao invalida: % -> %',
      old.current_status, new.current_status
      using errcode = 'check_violation',
            hint = 'Estados terminais exigem reopen_service_order().';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_order_status_validate on service_orders;
create trigger trg_order_status_validate
  before update of current_status on service_orders
  for each row
  execute function validate_status_transition();
