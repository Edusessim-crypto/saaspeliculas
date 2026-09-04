# FilmFlow — CLAUDE.md

Contexto e convenções do projeto para agentes. Setup, instalação e credenciais de
demo estão no [README.md](README.md) — este arquivo não os repete.

## Produto

SaaS vertical B2B para lojas de aplicação de películas automotivas, arquitetônicas,
PPF e envelopamento. Não é um ERP genérico nem uma "agenda para oficina": é o
**sistema operacional da loja**, obcecado pela operação diária.

Nasceu de uma dor real numa operação que fatura >R$ 150k/mês, e responde a uma
única pergunta:

> Como fazer uma loja com vários atendimentos e vários aplicadores funcionar de
> forma organizada sem que o proprietário precise controlar tudo pessoalmente?

O núcleo é o fluxo **AGENDAR → DISTRIBUIR → EXECUTAR → CONFERIR → ENTREGAR → ACOMPANHAR**.
Toda funcionalidade que não contribui para esse fluxo tem prioridade menor.

**Prioridade em caso de conflito de escopo** (do maior para o menor): Hoje na Loja,
Agenda, Operação, Aplicador Mobile, Realtime, Checklists, Equipe, Clientes,
Indicadores, Configurações. Entre "mais funcionalidades" e "melhor funcionamento da
operação principal", escolha sempre a segunda.

O nome FilmFlow é provisório. Branding fica em componentes reutilizáveis
(`src/components/shell/logo.tsx`) para permitir troca posterior.

## Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript strict**
- **Tailwind CSS v4** (`@theme` em `src/app/globals.css`) + primitivos estilo shadcn/ui sobre **Radix**
- **Supabase**: Postgres, Auth, RLS, Realtime — via `@supabase/ssr`
- **React Hook Form + Zod** (forms), **date-fns** (datas), **dnd-kit** (Kanban), **Recharts** (gráficos), **lucide-react** (ícones), **sonner** (toasts)
- **Vitest** para testes de domínio

Não introduza dependências pesadas sem necessidade real.

## Arquitetura

`service_orders` é a **entidade-âncora**. Agenda, Kanban, app do aplicador e
indicadores são *projeções* da mesma tabela + `status_history`. Isso evita
divergência de estado entre telas e permite realtime com uma única subscription
por organização. Ao adicionar uma tela nova, projete a partir dessa tabela em vez
de criar estado paralelo.

### Camadas

| Caminho | Responsabilidade |
|---|---|
| `src/domain/` | Regras puras, sem I/O: state machine, permissões, status, timing, defaults. Testável isoladamente. |
| `src/lib/data/` | Leitura no servidor consumida por Server Components. |
| `src/lib/actions/` | Server Actions (mutações) com validação Zod. |
| `src/lib/supabase/` | Clients server/browser/middleware. |
| `src/components/` | UI por domínio (`orders/`, `schedule/`, `applicator/`, …) + `ui/` primitivos. |
| `src/hooks/` | Realtime, atalhos de teclado. |
| `src/types/` | Tipos do banco e do contexto de sessão. |

Regras puras vão em `src/domain/` — nada de I/O ali. Lógica de negócio não deve
morar dentro de componentes.

### Server vs Client Components

Server Components por padrão. Client Components apenas onde há interação real.
Evite estado global desnecessário.

As páginas autenticadas usam `export const dynamic = 'force-dynamic'` — necessário
porque dependem de sessão e `searchParams`. Quem usa `useSearchParams()` **fora**
de uma rota `force-dynamic` (ex.: `/login`) precisa de fronteira `<Suspense>`, ou o
`next build` quebra na prerenderização.

## Convenções obrigatórias

### Server Actions

Toda Server Action passa por `authorize(permission)` de
[src/lib/actions/shared.ts](src/lib/actions/shared.ts) antes de tocar no banco, e
retorna `ActionResult` via `succeed()` / `fail()`. O check de permissão no
frontend é para dar mensagem útil ao usuário — **o RLS é a defesa real**.

Mudanças relevantes chamam `logActivity()`, preservando histórico operacional.

### Multi-tenancy — inegociável

Todo dado operacional tem `organization_id` (e `location_id` quando aplicável).
Nenhuma informação operacional existe globalmente. Uma organização nunca pode ver
dados de outra. Nunca crie tabela ou query que escape desse vínculo.

### Permissões

Quatro papéis: `owner`, `manager`, `reception`, `applicator`. A matriz vive em
[src/domain/roles.ts](src/domain/roles.ts) e **espelha as policies de RLS**. Ao
mudar permissão, altere os dois lados — o domínio e a migration.

Helpers de RLS no banco: `auth_org_ids`, `auth_is_member`, `auth_is_admin`,
`auth_role_in`, `auth_can_operate`, `auth_is_assigned`.

### State machine

Transições em [src/domain/state-machine.ts](src/domain/state-machine.ts). Status:
`scheduled → arrived → waiting → preparation → application → inspection → ready → delivered`,
mais `cancelled` e `no_show`.

Decisões já tomadas, não as reverta sem motivo:
- Retrocesso de **uma etapa** é permitido (erro de clique é o evento mais comum na operação real; obrigar reabertura trava a loja).
- Estados terminais (`delivered`, `cancelled`, `no_show`) só saem por reabertura explícita (`reopen()`), restrita por permissão.
- `checkTransition()` sinaliza `requiresChecklist`, `requiresConfirmation` e `requiresReason` — respeite esses flags na UI.

Toda mudança de status gera `status_history`. Início grava `actual_start`, conclusão
grava `actual_end`.

**O grafo existe em dois lugares e precisa mudar junto**: `TRANSITIONS` no domínio
e `order_status_can_transition()` na migration `20260101000003`. Até essa migration
a validação só existia no TypeScript, e um `UPDATE` direto pulava de `scheduled`
para `delivered`. `tests/state-machine-parity.test.ts` lê o SQL e compara com o
domínio — se divergirem, o teste quebra.

Sair de um estado terminal é possível apenas via `reopen_service_order()`, restrita
a `owner`/`manager`.

### Status na UI

`STATUS_CONFIG` em [src/domain/status.ts](src/domain/status.ts) é a fonte única de
label, tom semântico, ícone e se aparece no Kanban. Nunca replique essa lógica por
tela, e nunca dependa só de cor para transmitir status (acessibilidade).

### Conflitos de agenda

Verificados pela função Postgres `check_schedule_conflicts` (aplicador, box,
horário de funcionamento). Conflito **não bloqueia de forma absoluta**: a UI mostra
o conflito e sugere alternativas; forçar exige a permissão `orders:force_conflict`.

### Realtime

[src/hooks/use-realtime-orders.ts](src/hooks/use-realtime-orders.ts) assina apenas
`service_orders` da organização atual e dispara `router.refresh()` com debounce de
350ms, em vez de reconstruir o objeto composto no client. Nunca assine o banco
inteiro.

O cenário crítico: aplicador finaliza no celular → tela da recepção move para
CONFERÊNCIA sem F5. Esse fluxo não pode regredir.

### Idioma e formatação

Interface inteiramente em **pt-BR**. Datas `DD/MM/YYYY`, horas 24h, moeda
`R$ 1.250,00`, timezone `America/Sao_Paulo` (via `NEXT_PUBLIC_APP_TIMEZONE`).
Durações como `1h30`, não `90 minutos`. Placa em maiúsculas (`ABC1D23`), telefone
`(51) 99999-9999`.

Use sempre os helpers de [src/lib/format.ts](src/lib/format.ts) — não formate
inline.

**Nomenclatura na UI**: Atendimento, Serviço, Aplicador, Cliente, Veículo, Agenda,
Operação. Evite termos de banco ("service order") nas telas.

**Microcopy** humana: "Serviço iniciado", não "Operação realizada com sucesso".
"Não foi possível salvar a alteração", não "Falha na operação".

### Design system

Tokens CSS em `src/app/globals.css` — **nunca hardcode cores**. Base `#f7f8fa`,
cards brancos, marca `#172554` (azul petróleo), accent `#2563eb`. Raio de card 12px,
controle 9px. Sombras sutis; prefira `border + background`.

Estética: SaaS premium, limpo, alta densidade e legibilidade — referências de
acabamento são Linear, Stripe, Notion, Raycast, Vercel (sem copiar interfaces).
Evite gradientes aleatórios, glassmorphism, neon, cards enormes, sombras pesadas,
excesso de `rounded-full` e textos de marketing dentro do sistema.

Dark mode não é prioridade; os tokens já estão estruturados para permitir depois.

### Responsividade

Regra absoluta: mobile tem decisões próprias de UX, não é "desktop comprimido".
Testar em 320, 375, 390, 430, 768, 1024, 1280, 1440px.

- `<768px`: bottom navigation, sem sidebar, cards full width, drawer vira full-screen, agenda default diária.
- Kanban mobile: tabs de status roláveis com uma coluna por vez — **não** depender de drag-and-drop no celular.
- Tabelas viram cards/listas no mobile; nunca scroll horizontal quebrado no body.
- Larguras fixas (`min-w-[…]`) devem viver dentro de `overflow-x-auto`.
- A grade da agenda escala a largura mínima pelo número de aplicadores (com `flex-1` fixo, 6+ colunas ficavam ilegíveis).
- Formulários empilham abaixo de 400px; `grid-cols-1` não pode conviver com `col-span-2`.
- Respeitar `env(safe-area-inset-bottom)`; alvos de toque confortáveis.

### Estados de interface

Toda tela trata loading, empty, error, success e disabled. Use **skeletons**
(`loading.tsx` por rota), não spinners. Empty states com ação, sem ilustrações
infantis. Confirmação apenas para ações destrutivas ou sobrescrita de conflito —
não para ações triviais.

Não crie placeholders inúteis: sem botões que fingem funcionar.

### TypeScript e código

`strict` com `noUncheckedIndexedAccess` e `noUnusedLocals`. Evite `any`.
Comente apenas lógica de negócio complexa e decisões arquiteturais — nada de
comentários óbvios. As referências `§N` nos comentários apontam para as seções da
especificação original do produto.

**React 19**: `setState` dentro de `useEffect` é erro de lint. Os padrões adotados
no projeto são inicializador lazy, estado derivado e **remontagem por `key`**
(wrapper controla a chave, corpo do formulário inicializa estado das props) —
14 componentes já foram refatorados assim. Siga esses padrões em vez de silenciar
a regra.

### Banco

Migrations versionadas em `supabase/migrations/` — nunca criar tabela pelo painel.
21 tabelas; `service_orders` no centro.

Aplicação: `SUPABASE_DB_URL='postgresql://...' npm run db:migrate`. O runner
registra o que já rodou em `schema_migrations`, então reexecutar aplica só o
pendente. Não use `supabase db push` — exige login interativo de conta, que as
chaves de projeto não substituem.

Após qualquer migration que mexa em tabela ou policy, rode `npm run db:verify`:
ele falha se alguma tabela ficar sem RLS ativo ou sem policy.

Invariantes de modelagem:
- `vehicle_id` é **nullable** por decisão de arquitetura: o produto precisa suportar serviços sem veículo (película arquitetônica em obra/condomínio). Não torne obrigatório.
- Soft delete via `is_active` para serviços e colaboradores — não apague histórico.
- Índices em `organization_id`, `scheduled_start`, `current_status`, associações de aplicador, telefone do cliente e placa.
- Cuidado com UTC vs. horário local nos campos de tempo.

### Testes

Vitest cobre as regras críticas em `tests/`: state machine, paridade com o SQL,
timing/atrasos, permissões, validação e formatação. **69 testes**.

Contra o banco real há três verificadores: `db:verify` (schema e RLS ativo),
`db:verify:rls` (isolamento multi-tenant com usuários reais) e `db:verify:flow`
(fluxo operacional completo). Eles usam a chave `anon` justamente para exercitar
o RLS — a `service_role` o ignora e mascararia falhas. Não escreva testes cosméticos —
teste conflito de agenda, transição de status, cálculo de duração e permissões.

### Segurança

`SUPABASE_SERVICE_ROLE_KEY` nunca no client — só em `scripts/seed.ts`. Nunca
prefixe segredo com `NEXT_PUBLIC_`. Não confie apenas no frontend para permissões.

## Ambiente — atenção

**Nunca mova este projeto para dentro de pastas sincronizadas pelo iCloud**
(`~/Desktop`, `~/Documents`). O projeto vivia em `~/Desktop/Dev - Sites/Saas - FilmStar`
e o `fileproviderd` saturava a máquina (load average chegando a 39 em 8 CPUs),
travando `next build` indefinidamente. Após a migração para `~/Projetos/filmflow`:

| | Desktop (iCloud) | ~/Projetos |
|---|---|---|
| `npm install` | 2 min | 5 s |
| `vitest` | 47 s | 1,6 s |
| `next build` | travava | 23 s |

Outras armadilhas já enfrentadas:
- Sempre confira o resultado de `npm install`. Uma instalação corrompida (`node_modules` de 10 MB, `react` com 0 bytes) mascarou erros de tipo reais por boa parte de uma sessão.
- `next.config` deve ser `.mjs`, não `.ts` — o loader TS travava antes de compilar qualquer coisa.
- `eslint-config-next` v16 exporta flat config nativa; passá-la por `FlatCompat` gera referência circular no ESLint 9.
- Builds concorrentes com testes/lint deadlockam. Rode um de cada vez.

## Verificação antes de considerar pronto

```
npm run lint && npm run typecheck && npm test && npm run build
```

Estado atual: todos passando (build com 18 rotas, 58 testes verdes).

## Pendências

1. Revisão visual de responsividade nas larguras do §159 foi feita por leitura de código, não em navegador real.
2. `npm audit` acusa falha de `postcss` aninhado no Next 15. Corrigir exigiria subir para o Next 16 (breaking). É risco de build-time, não de runtime — decidido não mexer agora.
3. A `service_role` trafegou por um chat durante o setup; vale rotacioná-la no painel antes de qualquer uso além de desenvolvimento.
4. O repositório é **público**. Nunca versione `.env.local`, o ID do projeto Supabase ou qualquer chave — o `.gitignore` já cobre `.env*.local`, mas confira antes de cada commit.

## Estado verificado contra o Supabase real

Em 04/09/2026, contra o projeto Supabase de desenvolvimento, tudo abaixo passou:

- 5 migrations aplicadas — 21 tabelas, 46 policies, 17 triggers
- RLS ativo em todas as tabelas; isolamento multi-tenant confirmado em 7 cenários
- Seed populado: 5 usuários, 16 tipos de serviço, 12 atendimentos
- Fluxo completo `scheduled → … → delivered` com histórico e timestamps corretos
- 10 rotas administrativas + app do aplicador carregando com dados reais
- lint, typecheck, 69 testes e build (18 rotas) limpos

## Fora de escopo no MVP

Não implementar: financeiro/fluxo de caixa, NFe, contabilidade, folha, estoque
completo, CRM complexo, marketing automation, WhatsApp API paga, comissões
avançadas, chat interno, IA generativa, billing/Stripe.

Arquitetura deve permanecer extensível para (sem implementar agora): WhatsApp
automático, orçamento, estoque de bobinas, mapa de corte, NPS, garantia digital,
fotos antes/depois, assinatura do cliente, multiunidade, API pública, integrações
de calendário, e planos Starter/Pro/Business.
