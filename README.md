# FilmFlow

**O sistema operacional para empresas de aplicação de películas.**

Central operacional para lojas de película automotiva, PPF, envelopamento e
película arquitetônica. Recepção, agenda e aplicadores trabalhando no mesmo
fluxo, com o estado da loja visível em tempo real.

> A operação da loja não pode depender do dono para funcionar.

---

## O que o produto resolve

O núcleo é um fluxo único, e todas as telas são projeções dele:

```
AGENDAR → DISTRIBUIR → EXECUTAR → CONFERIR → ENTREGAR → ACOMPANHAR
```

Em qualquer momento é possível saber qual veículo chegou, qual está em
execução, quem está executando, o que atrasou, o que aguarda conferência e
o que já pode ser entregue — sem WhatsApp, papel ou memória.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 15 (App Router, Server Components) |
| Linguagem | TypeScript (strict) |
| Estilo | Tailwind CSS v4 + design tokens em CSS |
| Componentes | Radix UI primitives + camada própria |
| Banco / Auth | Supabase (PostgreSQL, Auth, RLS, Realtime) |
| Formulários | React Hook Form + Zod |
| Datas | date-fns (locale pt-BR) |
| Drag and drop | dnd-kit |
| Gráficos | Recharts |
| Ícones | Lucide |
| Testes | Vitest |

---

## Instalação

### 1. Dependências

```bash
npm install
```

### 2. Projeto Supabase

Crie um projeto em [supabase.com](https://supabase.com) e copie as chaves em
**Settings → API**.

```bash
cp .env.example .env.local
```

Preencha `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
NEXT_PUBLIC_APP_TIMEZONE=America/Sao_Paulo
```

A `SUPABASE_SERVICE_ROLE_KEY` é usada **somente** pelo script de seed, que roda
localmente. Ela nunca chega ao browser — não use o prefixo `NEXT_PUBLIC_` nela.

### 3. Migrations

Com a [Supabase CLI](https://supabase.com/docs/guides/cli):

```bash
supabase link --project-ref <seu-project-ref>
supabase db push
```

Alternativa sem CLI: abra o **SQL Editor** do painel e execute, **nesta ordem**,
os arquivos de `supabase/migrations/`:

1. `20260101000000_initial_schema.sql` — tabelas, enums, índices
2. `20260101000001_functions_triggers.sql` — triggers, histórico, conflitos
3. `20260101000002_rls.sql` — Row Level Security e publicação de realtime

### 4. Dados de demonstração

```bash
npm run db:seed
```

Cria a **FilmStar Centro Automotivo** com um dia realista de operação: dois
carros em aplicação, um aguardando conferência, um pronto para entrega, um
agendado para a tarde, um serviço arquitetônico sem veículo e histórico dos
últimos dias para alimentar os indicadores.

### 5. Desenvolvimento

```bash
npm run dev
```

Abra [localhost:3000](http://localhost:3000).

---

## Credenciais da demonstração

Senha para todos: **`filmflow123`**

| E-mail | Papel | Entra em |
|---|---|---|
| `eduardo@filmstar.demo` | Proprietário | `/hoje` |
| `mariana@filmstar.demo` | Recepção | `/hoje` |
| `carlos@filmstar.demo` | Aplicador | `/app` |
| `lucas@filmstar.demo` | Aplicador PPF | `/app` |
| `rafael@filmstar.demo` | Aplicador | `/app` |

### Demonstração do fluxo completo

Abra **Mariana** no desktop e **Carlos** no celular (ou em outra janela):

1. Mariana cria um atendimento e ele aparece na agenda
2. Carlos vê o serviço em `/app` e toca **Iniciar**
3. A tela de Mariana atualiza sozinha, sem recarregar
4. Carlos finaliza — o checklist abre e exige os itens obrigatórios
5. O atendimento vai para **Em conferência** na tela da recepção
6. Mariana aprova → **Pronto para entrega** → **Entregue**
7. O histórico registra cada passo, com autor e horário

---

## Comandos

```bash
npm run dev         # desenvolvimento
npm run build       # build de produção
npm run start       # servidor de produção
npm run lint        # ESLint
npm run typecheck   # TypeScript sem emitir
npm test            # testes (Vitest)
npm run db:seed     # popula dados de demonstração
```

---

## Estrutura

```
src/
├── app/
│   ├── (app)/                 # área administrativa (sidebar + bottom nav)
│   │   ├── hoje/              # home da operação
│   │   ├── agenda/            # dia e semana, por horário ou aplicador
│   │   ├── operacao/          # kanban (DnD no desktop, tabs no mobile)
│   │   ├── equipe/            # colaboradores e produtividade
│   │   ├── clientes/          # clientes, veículos e histórico
│   │   ├── indicadores/       # métricas e gráficos
│   │   └── configuracoes/     # empresa, serviços, boxes, horários
│   ├── (applicator)/app/      # interface do aplicador (mobile-first)
│   ├── login/
│   └── onboarding/
├── components/
│   ├── ui/                    # primitivos do design system
│   ├── shell/                 # AppShell, sidebar, busca, notificações
│   ├── orders/                # card, linha, drawer, kanban, checklist
│   ├── schedule/              # grade da agenda, novo agendamento
│   ├── applicator/            # telas do aplicador
│   ├── team/  customers/  settings/  metrics/
├── domain/                    # regras de negócio, sem I/O
│   ├── status.ts              # catálogo de status (cor, ícone, rótulo)
│   ├── state-machine.ts       # transições permitidas
│   ├── roles.ts               # papéis e permissões
│   ├── timing.ts              # atraso, duração, sobreposição
│   └── defaults.ts            # catálogo inicial, checklist, horários
├── lib/
│   ├── data/                  # leituras (Server Components)
│   ├── actions/               # Server Actions (escrita)
│   ├── supabase/              # clients server, browser e middleware
│   ├── validation.ts          # schemas Zod
│   └── format.ts              # formatação pt-BR
├── hooks/                     # realtime, atalhos de teclado
└── types/                     # tipos do banco
```

**Regra de camadas:** `domain/` não importa nada de `lib/` nem do React — é
lógica pura e testável. `lib/data/` só lê, `lib/actions/` só escreve, e ambos
passam pelo Supabase com a sessão do usuário (nunca com service role).

---

## Banco de dados

### Tabelas

`organizations` · `locations` · `profiles` · `organization_members` ·
`employees` · `employee_specialties` · `workstations` · `customers` ·
`vehicles` · `service_types` · `service_orders` · `service_order_items` ·
`service_order_employees` · `status_history` · `activity_log` ·
`checklist_templates` · `checklist_items` · `checklist_responses` ·
`notifications` · `business_hours`

### Decisões de modelagem

**`service_orders` é a entidade central.** Hoje, Agenda, Operação, App do
aplicador e Indicadores são projeções da mesma tabela. Nenhuma tela mantém
estado próprio, então elas nunca divergem.

**`vehicle_id` é nullable.** Película arquitetônica não tem veículo, tem
endereço. O campo `service_address` cobre esse caso desde já, sem exigir
migração quando o módulo de obras for construído.

**Snapshot em `service_order_items`.** O nome e a duração do serviço são
copiados no momento do agendamento. Renomear ou reprecificar um serviço não
reescreve o histórico.

**Todo dado operacional tem `organization_id`.** Não existe linha global.

**Multi-tenancy é imposta pelo banco.** As policies de RLS usam funções
`SECURITY DEFINER` (`auth_is_member`, `auth_can_operate`, `auth_is_admin`,
`auth_is_assigned`) para evitar recursão entre policies. O frontend esconde
controles; o banco é quem recusa.

**Histórico é escrito por trigger.** `handle_status_change` grava em
`status_history`, carimba `actual_start` / `actual_end` e cria a notificação.
Qualquer cliente — web, mobile, uma futura API — produz a mesma trilha.

**Conflitos ficam no banco.** `check_schedule_conflicts()` compara intervalos
com `tstzrange` e retorna as colisões de aplicador e de box.

---

## Permissões

| | Proprietário | Gerente | Recepção | Aplicador |
|---|:---:|:---:|:---:|:---:|
| Ver operação e agenda | ✓ | ✓ | ✓ | próprios |
| Criar / editar atendimento | ✓ | ✓ | ✓ | — |
| Atribuir aplicadores | ✓ | ✓ | ✓ | — |
| Avançar status | ✓ | ✓ | ✓ | execução |
| Forçar conflito de horário | ✓ | ✓ | — | — |
| Reabrir atendimento | ✓ | ✓ | — | — |
| Gerenciar clientes | ✓ | ✓ | ✓ | — |
| Gerenciar equipe e serviços | ✓ | ✓ | — | — |
| Ver indicadores | ✓ | ✓ | — | — |
| Configurar a organização | ✓ | — | — | — |

O aplicador conduz preparação, aplicação e conferência, mas **não aprova o
próprio trabalho** nem entrega o veículo — isso é da recepção ou da gestão.

---

## Fluxo de status

```
AGENDADO → CLIENTE CHEGOU → AGUARDANDO INÍCIO → EM PREPARAÇÃO
   → EM APLICAÇÃO → EM CONFERÊNCIA → PRONTO → ENTREGUE
```

Mais `CANCELADO` e `NÃO COMPARECEU`.

Regras aplicadas em `src/domain/state-machine.ts`:

- Retroceder **uma** etapa é permitido (erro de clique é o evento mais comum na
  operação real; travar isso paralisa a loja)
- `ENTREGUE`, `CANCELADO` e `NÃO COMPARECEU` são terminais — só saem por
  reabertura explícita, restrita à gestão
- Ir para `EM CONFERÊNCIA` exige o checklist obrigatório completo
- Cancelar exige motivo; entregar exige confirmação

---

## Realtime

O aplicador finaliza no celular e a tela da recepção muda sozinha.

A assinatura é por organização (`orders:<organization_id>`), nunca do banco
inteiro. Mudanças disparam `router.refresh()` com debounce de 350 ms: o Server
Component recarrega a projeção completa e o React reconcilia sem piscar — o
cliente não precisa refazer os joins.

---

## Responsividade

Testado de 320 px a 1440 px+. O mobile tem decisões próprias, não é o desktop
comprimido:

| Elemento | Desktop | Mobile |
|---|---|---|
| Navegação | sidebar recolhível | bottom navigation + "Mais" |
| Kanban | 5 colunas com drag-and-drop | tabs por etapa, avanço por botão |
| Agenda | semana, colunas por aplicador | dia, lista cronológica |
| Tabelas | colunas | cards estruturados |
| Detalhes | drawer lateral | sheet quase full-screen |

Alvos de toque confortáveis, `env(safe-area-inset-bottom)` respeitado, inputs
de 44 px (evita o zoom automático do iOS).

---

## Testes

```bash
npm test
```

58 testes cobrindo o que quebra a operação se estiver errado:

- **`state-machine`** — fluxo feliz, transições proibidas, permissões por papel
- **`timing`** — detecção de atraso, duração, sobreposição de intervalos
- **`permissions`** — matriz de papéis e permissões
- **`validation`** — schemas Zod (placa, telefone, atendimento sem veículo)
- **`format`** — formatação pt-BR (`1h30`, `(51) 99999-9999`, `R$ 1.250,00`)

---

## Preparado para, mas não implementado

A arquitetura já acomoda estes casos sem migração estrutural:

- **Múltiplas unidades** — `location_id` existe em toda tabela relevante
- **Obras arquitetônicas** — `vehicle_id` nullable + `service_address`
- **Checklists por empresa** — `checklist_templates` é por organização
- **Planos e limites** — `plan`, `max_users`, `max_locations` em `organizations`
- **Análise de gargalos** — `status_history` guarda cada transição com autor e
  horário, permitindo medir tempo entre chegada, início, aplicação e entrega
- **Push notifications** — `notifications` já é uma tabela real, com realtime

Fora do escopo desta versão: financeiro, NFe, estoque, comissões, WhatsApp API,
CRM, billing.
