-- Fecha a tabela de controle de migrations.
--
-- `schema_migrations` e criada por scripts/apply-migrations.ts e vive em
-- `public`, entao fica exposta via PostgREST. Nao contem dado sensivel, mas
-- revela a estrutura de versionamento e nao deve ser legivel nem gravavel por
-- nenhum cliente — so o processo de migration, que conecta como owner e
-- ignora RLS.

alter table if exists schema_migrations enable row level security;

drop policy if exists schema_migrations_no_access on schema_migrations;
create policy schema_migrations_no_access
  on schema_migrations
  for all
  using (false)
  with check (false);

revoke all on schema_migrations from anon, authenticated;
