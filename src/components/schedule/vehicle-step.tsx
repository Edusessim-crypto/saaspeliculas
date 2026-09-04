'use client'

import { useEffect, useState, useTransition } from 'react'
import { Car, Plus, Check, MapPin } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { StepChoice } from './customer-step'
import { getVehiclesFor } from '@/lib/actions/booking-data'
import { createVehicle } from '@/lib/actions/customers'
import { formatPlate, formatVehicle } from '@/lib/format'
import type { Vehicle } from '@/types/database'

/**
 * Passo 2: veículo. Também permite atendimento sem veículo — a obra
 * arquitetônica, que o schema já suporta (§87).
 */
export function VehicleStep({
  customerId,
  selected,
  address,
  onSelect,
  onAddressChange,
}: {
  customerId: string
  selected: Vehicle | null
  address: string
  onSelect: (vehicle: Vehicle | null) => void
  onAddressChange: (address: string) => void
}) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [mode, setMode] = useState<'list' | 'new' | 'address'>('list')
  const [saving, startSave] = useTransition()
  const [draft, setDraft] = useState({ brand: '', model: '', plate: '', year: '' })

  useEffect(() => {
    let cancelled = false
    void getVehiclesFor(customerId).then((data) => {
      if (cancelled) return
      setVehicles(data)
      // Um único veículo: seleciona sozinho e economiza um toque.
      if (data.length === 1 && !selected && !address) onSelect(data[0] ?? null)
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId])

  function submitNew() {
    startSave(async () => {
      const result = await createVehicle({
        customer_id: customerId,
        brand: draft.brand,
        model: draft.model,
        plate: draft.plate,
        year: draft.year || null,
      })
      if (!result.ok || !result.data) {
        toast.error(result.error ?? 'Não foi possível salvar o veículo.')
        return
      }
      toast.success('Veículo cadastrado.')
      setVehicles((prev) => [result.data as Vehicle, ...prev])
      onSelect(result.data)
      setMode('list')
    })
  }

  if (selected) {
    return (
      <div className="rounded-[var(--radius-control)] border border-[var(--color-accent)] bg-[var(--color-accent-subtle)] p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[14px] font-semibold text-[var(--color-ink)]">
              <Check className="size-4 text-[var(--color-accent)]" aria-hidden />
              {formatVehicle(selected)}
            </p>
            {selected.plate ? (
              <p className="tnum mt-0.5 text-[12.5px] text-[var(--color-ink-muted)]">
                {formatPlate(selected.plate)}
              </p>
            ) : null}
          </div>
          <Button variant="ghost" size="sm" onClick={() => onSelect(null)}>
            Trocar
          </Button>
        </div>
      </div>
    )
  }

  if (mode === 'address') {
    return (
      <div className="space-y-3">
        <Field
          label="Endereço do serviço"
          htmlFor="service-address"
          required
          hint="Para películas arquitetônicas e serviços externos."
        >
          <Input
            id="service-address"
            value={address}
            onChange={(e) => onAddressChange(e.target.value)}
            placeholder="Av. Exemplo, 1000 — Sala 20"
            autoFocus
          />
        </Field>
        <Button
          variant="ghost"
          block
          onClick={() => {
            onAddressChange('')
            setMode('list')
          }}
        >
          Voltar para veículos
        </Button>
      </div>
    )
  }

  if (mode === 'new') {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2">
          <Field label="Marca" htmlFor="v-brand" required>
            <Input
              id="v-brand"
              value={draft.brand}
              onChange={(e) => setDraft((d) => ({ ...d, brand: e.target.value }))}
              placeholder="Toyota"
              autoFocus
              autoCapitalize="words"
            />
          </Field>
          <Field label="Modelo" htmlFor="v-model" required>
            <Input
              id="v-model"
              value={draft.model}
              onChange={(e) => setDraft((d) => ({ ...d, model: e.target.value }))}
              placeholder="Corolla"
              autoCapitalize="words"
            />
          </Field>
          <Field label="Placa" htmlFor="v-plate">
            <Input
              id="v-plate"
              value={draft.plate}
              onChange={(e) => setDraft((d) => ({ ...d, plate: e.target.value.toUpperCase() }))}
              placeholder="ABC1D23"
              autoCapitalize="characters"
              maxLength={8}
              className="tnum uppercase"
            />
          </Field>
          <Field label="Ano" htmlFor="v-year">
            <Input
              id="v-year"
              value={draft.year}
              onChange={(e) => setDraft((d) => ({ ...d, year: e.target.value }))}
              placeholder="2025"
              inputMode="numeric"
              maxLength={4}
              className="tnum"
            />
          </Field>
        </div>

        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => setMode('list')} className="flex-1">
            Voltar
          </Button>
          <Button
            variant="primary"
            onClick={submitNew}
            loading={saving}
            disabled={!draft.brand.trim() || !draft.model.trim()}
            className="flex-1"
          >
            Cadastrar
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {vehicles.map((vehicle) => (
        <StepChoice
          key={vehicle.id}
          title={formatVehicle(vehicle)}
          subtitle={vehicle.plate ? formatPlate(vehicle.plate) : 'Sem placa'}
          onClick={() => onSelect(vehicle)}
          trailing={<Car className="size-4 shrink-0 text-[var(--color-ink-subtle)]" aria-hidden />}
        />
      ))}

      <Button variant="secondary" block onClick={() => setMode('new')}>
        <Plus />
        Novo veículo
      </Button>

      <Button
        variant="ghost"
        block
        onClick={() => setMode('address')}
        className="text-[12.5px]"
      >
        <MapPin />
        Serviço sem veículo (obra / externo)
      </Button>
    </div>
  )
}
