'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Check, ChevronRight, Plus, X, PartyPopper } from 'lucide-react'
import { Logo } from '@/components/shell/logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/field'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { completeOnboarding } from '@/lib/actions/onboarding'
import {
  DEFAULT_HOURS,
  DEFAULT_SERVICE_TYPES,
  WEEKDAY_LABELS,
  IDENTITY_COLORS,
  CATEGORY_LABELS,
} from '@/domain/defaults'
import { ROLE_LABELS } from '@/domain/roles'
import { formatDuration } from '@/lib/format'
import { cn } from '@/lib/utils'

type Step = 0 | 1 | 2 | 3 | 4 | 5

const STEP_LABELS = ['Empresa', 'Unidade', 'Horários', 'Equipe', 'Serviços']

interface DraftEmployee {
  full_name: string
  role: 'manager' | 'reception' | 'applicator'
  color: string
}

export function OnboardingWizard({
  defaultCompanyName,
  userName,
}: {
  defaultCompanyName: string
  userName: string
}) {
  const router = useRouter()
  const [step, setStep] = useState<Step>(0)
  const [pending, startTransition] = useTransition()

  const [companyName, setCompanyName] = useState(defaultCompanyName)
  const [locationName, setLocationName] = useState('Unidade principal')
  const [locationAddress, setLocationAddress] = useState('')
  const [hours, setHours] = useState(DEFAULT_HOURS)
  const [employees, setEmployees] = useState<DraftEmployee[]>([])
  const [employeeDraft, setEmployeeDraft] = useState<DraftEmployee>({
    full_name: '',
    role: 'applicator',
    color: IDENTITY_COLORS[0],
  })
  const [serviceKeys, setServiceKeys] = useState<string[]>(
    DEFAULT_SERVICE_TYPES.filter((s) => s.category === 'automotive_film' || s.category === 'ppf').map(
      (s) => s.key,
    ),
  )

  function submit() {
    startTransition(async () => {
      const result = await completeOnboarding({
        company_name: companyName,
        location_name: locationName,
        location_address: locationAddress,
        hours,
        employees,
        service_type_ids: serviceKeys,
      })

      if (!result.ok) {
        toast.error(result.error ?? 'Não foi possível concluir a configuração.')
        return
      }

      setStep(5)
    })
  }

  if (step === 5) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-4 py-10">
        <div className="w-full max-w-[420px] text-center">
          <span className="mx-auto mb-4 inline-flex size-14 items-center justify-center rounded-full bg-[var(--color-success-subtle)]">
            <PartyPopper className="size-6 text-[var(--color-success)]" aria-hidden />
          </span>
          <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-[var(--color-ink)]">
            Seu ambiente está pronto.
          </h1>
          <p className="mt-2 text-[14px] leading-relaxed text-[var(--color-ink-muted)]">
            A partir de agora, tudo que acontece na loja aparece em uma única tela.
          </p>
          <Button
            variant="primary"
            size="lg"
            block
            className="mt-6"
            onClick={() => {
              router.push('/hoje')
              router.refresh()
            }}
          >
            Ir para Hoje
          </Button>
        </div>
      </main>
    )
  }

  const canAdvance =
    step === 0
      ? companyName.trim().length >= 2
      : step === 1
        ? locationName.trim().length >= 1
        : true

  return (
    <main className="min-h-dvh bg-[var(--color-surface)] px-4 py-8">
      <div className="mx-auto w-full max-w-[520px]">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>

        <div className="mb-5">
          <div className="flex gap-1.5">
            {STEP_LABELS.map((label, index) => (
              <div key={label} className="flex-1">
                <div
                  className={cn(
                    'h-1 rounded-full transition-colors',
                    index <= step ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-border)]',
                  )}
                />
              </div>
            ))}
          </div>
          <p className="mt-2 text-center text-[12px] font-medium text-[var(--color-ink-muted)]">
            Passo {step + 1} de {STEP_LABELS.length} · {STEP_LABELS[step]}
          </p>
        </div>

        <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-5 shadow-[var(--shadow-subtle)]">
          {step === 0 ? (
            <>
              <Title
                title={`Bem-vindo${userName ? `, ${userName.split(' ')[0]}` : ''}.`}
                subtitle="Vamos configurar sua loja em menos de dois minutos."
              />
              <Field label="Nome da empresa" htmlFor="ob-company" required className="mt-4">
                <Input
                  id="ob-company"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="FilmStar Centro Automotivo"
                  autoFocus
                  autoCapitalize="words"
                />
              </Field>
            </>
          ) : null}

          {step === 1 ? (
            <>
              <Title title="Sua unidade" subtitle="Onde a operação acontece." />
              <div className="mt-4 space-y-3">
                <Field label="Nome da unidade" htmlFor="ob-location" required>
                  <Input
                    id="ob-location"
                    value={locationName}
                    onChange={(e) => setLocationName(e.target.value)}
                    autoFocus
                  />
                </Field>
                <Field label="Endereço" htmlFor="ob-address" hint="Opcional">
                  <Input
                    id="ob-address"
                    value={locationAddress}
                    onChange={(e) => setLocationAddress(e.target.value)}
                    placeholder="Av. Exemplo, 1000"
                  />
                </Field>
              </div>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <Title
                title="Horário de funcionamento"
                subtitle="Pode ajustar depois em Configurações."
              />
              <ul className="mt-4 divide-y divide-[var(--color-border)]">
                {hours.map((day) => (
                  <li key={day.weekday} className="flex items-center gap-3 py-2.5">
                    <Switch
                      checked={day.is_open}
                      aria-label={WEEKDAY_LABELS[day.weekday]}
                      onCheckedChange={(value) =>
                        setHours((prev) =>
                          prev.map((h) =>
                            h.weekday === day.weekday ? { ...h, is_open: value } : h,
                          ),
                        )
                      }
                    />
                    <span className="min-w-0 flex-1 truncate text-[13.5px] text-[var(--color-ink)]">
                      {WEEKDAY_LABELS[day.weekday]}
                    </span>
                    {day.is_open ? (
                      <div className="flex items-center gap-1.5">
                        <Input
                          type="time"
                          value={day.opens_at ?? '08:00'}
                          onChange={(e) =>
                            setHours((prev) =>
                              prev.map((h) =>
                                h.weekday === day.weekday
                                  ? { ...h, opens_at: e.target.value }
                                  : h,
                              ),
                            )
                          }
                          className="tnum h-9 w-[92px] px-2 text-center text-[13px]"
                          aria-label={`Abertura ${WEEKDAY_LABELS[day.weekday]}`}
                        />
                        <Input
                          type="time"
                          value={day.closes_at ?? '18:00'}
                          onChange={(e) =>
                            setHours((prev) =>
                              prev.map((h) =>
                                h.weekday === day.weekday
                                  ? { ...h, closes_at: e.target.value }
                                  : h,
                              ),
                            )
                          }
                          className="tnum h-9 w-[92px] px-2 text-center text-[13px]"
                          aria-label={`Fechamento ${WEEKDAY_LABELS[day.weekday]}`}
                        />
                      </div>
                    ) : (
                      <span className="text-[12.5px] text-[var(--color-ink-subtle)]">Fechado</span>
                    )}
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          {step === 3 ? (
            <>
              <Title
                title="Sua equipe"
                subtitle="Adicione os aplicadores e a recepção. Pode pular e fazer depois."
              />

              {employees.length > 0 ? (
                <ul className="mt-4 space-y-1.5">
                  {employees.map((employee, index) => (
                    <li
                      key={index}
                      className="flex items-center gap-2.5 rounded-[var(--radius-control)] border border-[var(--color-border)] px-3 py-2.5"
                    >
                      <span
                        aria-hidden
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: employee.color }}
                      />
                      <span className="min-w-0 flex-1 truncate text-[13.5px] text-[var(--color-ink)]">
                        {employee.full_name}
                      </span>
                      <span className="shrink-0 text-[12px] text-[var(--color-ink-muted)]">
                        {ROLE_LABELS[employee.role]}
                      </span>
                      <button
                        type="button"
                        aria-label={`Remover ${employee.full_name}`}
                        onClick={() =>
                          setEmployees((prev) => prev.filter((_, i) => i !== index))
                        }
                        className="inline-flex size-7 shrink-0 items-center justify-center rounded text-[var(--color-ink-subtle)] transition-colors hover:bg-[var(--color-surface-hover)]"
                      >
                        <X className="size-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}

              <div className="mt-4 space-y-3 rounded-[var(--radius-control)] border border-[var(--color-border)] p-3">
                <Field label="Nome" htmlFor="ob-emp-name">
                  <Input
                    id="ob-emp-name"
                    value={employeeDraft.full_name}
                    onChange={(e) =>
                      setEmployeeDraft((d) => ({ ...d, full_name: e.target.value }))
                    }
                    placeholder="Carlos Mendes"
                    autoCapitalize="words"
                  />
                </Field>

                <div className="flex flex-wrap gap-1.5">
                  {(['applicator', 'reception', 'manager'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      aria-pressed={employeeDraft.role === r}
                      onClick={() => setEmployeeDraft((d) => ({ ...d, role: r }))}
                      className={cn(
                        'h-9 rounded-[var(--radius-pill)] border px-3 text-[13px] font-medium transition-colors',
                        employeeDraft.role === r
                          ? 'border-[var(--color-accent)] bg-[var(--color-accent-subtle)] text-[var(--color-accent-hover)]'
                          : 'border-[var(--color-border-strong)] text-[var(--color-ink-muted)]',
                      )}
                    >
                      {ROLE_LABELS[r]}
                    </button>
                  ))}
                </div>

                <Button
                  variant="secondary"
                  block
                  disabled={employeeDraft.full_name.trim().length < 2}
                  onClick={() => {
                    setEmployees((prev) => [
                      ...prev,
                      {
                        ...employeeDraft,
                        color:
                          IDENTITY_COLORS[prev.length % IDENTITY_COLORS.length] ??
                          IDENTITY_COLORS[0],
                      },
                    ])
                    setEmployeeDraft({
                      full_name: '',
                      role: 'applicator',
                      color: IDENTITY_COLORS[0],
                    })
                  }}
                >
                  <Plus />
                  Adicionar à equipe
                </Button>
              </div>
            </>
          ) : null}

          {step === 4 ? (
            <>
              <Title
                title="Serviços que a loja executa"
                subtitle="Escolha os principais. Você ajusta o catálogo depois."
              />
              <div className="mt-4 max-h-[46vh] space-y-3 overflow-y-auto">
                {Object.entries(
                  DEFAULT_SERVICE_TYPES.reduce<Record<string, typeof DEFAULT_SERVICE_TYPES>>(
                    (acc, service) => {
                      ;(acc[service.category] ??= []).push(service)
                      return acc
                    },
                    {},
                  ),
                ).map(([category, services]) => (
                  <div key={category}>
                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink-subtle)]">
                      {CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS]}
                    </p>
                    <div className="space-y-1">
                      {services.map((service) => {
                        const checked = serviceKeys.includes(service.key)
                        return (
                          <label
                            key={service.key}
                            className={cn(
                              'flex cursor-pointer items-center gap-3 rounded-[var(--radius-control)] border px-3 py-2.5 transition-colors',
                              checked
                                ? 'border-[var(--color-accent)] bg-[var(--color-accent-subtle)]'
                                : 'border-[var(--color-border)]',
                            )}
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(value) =>
                                setServiceKeys((prev) =>
                                  value === true
                                    ? [...prev, service.key]
                                    : prev.filter((k) => k !== service.key),
                                )
                              }
                            />
                            <span className="min-w-0 flex-1 truncate text-[13.5px] text-[var(--color-ink)]">
                              {service.name}
                            </span>
                            <span className="tnum shrink-0 text-[12px] text-[var(--color-ink-muted)]">
                              {formatDuration(service.duration)}
                            </span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : null}

          <div className="mt-5 flex items-center gap-2">
            {step > 0 ? (
              <Button
                variant="ghost"
                size="lg"
                onClick={() => setStep((s) => (s - 1) as Step)}
                disabled={pending}
              >
                Voltar
              </Button>
            ) : null}

            {step === 4 ? (
              <Button
                variant="primary"
                size="lg"
                className="ml-auto"
                loading={pending}
                onClick={submit}
              >
                <Check />
                Concluir
              </Button>
            ) : (
              <Button
                variant="primary"
                size="lg"
                className="ml-auto"
                disabled={!canAdvance}
                onClick={() => setStep((s) => (s + 1) as Step)}
              >
                {step === 3 && employees.length === 0 ? 'Pular' : 'Continuar'}
                <ChevronRight />
              </Button>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}

function Title({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h1 className="text-[18px] font-semibold tracking-[-0.02em] text-[var(--color-ink)]">
        {title}
      </h1>
      <p className="mt-1 text-[13.5px] leading-relaxed text-[var(--color-ink-muted)]">
        {subtitle}
      </p>
    </div>
  )
}
