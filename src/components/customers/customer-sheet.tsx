'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Sheet, SheetContent, SheetHeader, SheetBody, SheetFooter } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { Field } from '@/components/ui/field'
import { createCustomer, updateCustomer } from '@/lib/actions/customers'
import type { Customer } from '@/types/database'

export function CustomerSheet({
  open,
  onOpenChange,
  customer,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  customer: Customer | null
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        {/* A key remonta o formulario a cada abertura, dispensando o
            efeito de reset (React: "reset state with a key"). */}
        {open ? (
          <CustomerForm
            key={customer?.id ?? 'novo'}
            customer={customer}
            onOpenChange={onOpenChange}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

function CustomerForm({
  customer,
  onOpenChange,
}: {
  customer: Customer | null
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [form, setForm] = useState({
    name: customer?.name ?? '',
    phone: customer?.phone ?? '',
    whatsapp: customer?.whatsapp ?? '',
    email: customer?.email ?? '',
    document: customer?.document ?? '',
    notes: customer?.notes ?? '',
  })

  function submit() {
    startTransition(async () => {
      const payload = {
        ...form,
        // Sem WhatsApp informado, assume o telefone: é o caso comum.
        whatsapp: form.whatsapp || form.phone,
      }
      const result = customer
        ? await updateCustomer(customer.id, payload)
        : await createCustomer(payload)

      if (!result.ok) {
        toast.error(result.error ?? 'Não foi possível salvar.')
        return
      }

      toast.success(customer ? 'Cliente atualizado.' : 'Cliente cadastrado.')
      onOpenChange(false)
      router.refresh()
    })
  }

  return (
    <>
        <SheetHeader title={customer ? 'Editar cliente' : 'Novo cliente'} />

        <SheetBody>
          <div className="space-y-4 p-4 sm:p-5">
            <Field label="Nome" htmlFor="c-name" required>
              <Input
                id="c-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Nome completo"
                autoCapitalize="words"
              />
            </Field>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Telefone" htmlFor="c-phone">
                <Input
                  id="c-phone"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="(51) 99999-9999"
                  inputMode="tel"
                  type="tel"
                />
              </Field>

              <Field label="WhatsApp" htmlFor="c-whatsapp" hint="Vazio usa o telefone.">
                <Input
                  id="c-whatsapp"
                  value={form.whatsapp}
                  onChange={(e) => setForm((f) => ({ ...f, whatsapp: e.target.value }))}
                  placeholder="(51) 99999-9999"
                  inputMode="tel"
                  type="tel"
                />
              </Field>
            </div>

            <Field label="E-mail" htmlFor="c-email">
              <Input
                id="c-email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="cliente@email.com"
                inputMode="email"
                type="email"
                autoCapitalize="none"
              />
            </Field>

            <Field label="CPF / CNPJ" htmlFor="c-document">
              <Input
                id="c-document"
                value={form.document}
                onChange={(e) => setForm((f) => ({ ...f, document: e.target.value }))}
                placeholder="Opcional"
                inputMode="numeric"
                className="tnum"
              />
            </Field>

            <Field label="Observações" htmlFor="c-notes">
              <Textarea
                id="c-notes"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Preferências, restrições, histórico relevante"
                rows={3}
              />
            </Field>
          </div>
        </SheetBody>

        <SheetFooter>
          <Button variant="ghost" size="lg" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="lg"
            loading={pending}
            disabled={form.name.trim().length < 2}
            onClick={submit}
          >
            Salvar
          </Button>
        </SheetFooter>
    </>
  )
}
