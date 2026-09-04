'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/field'
import { Badge } from '@/components/ui/badge'
import { updateOrganization } from '@/lib/actions/settings'
import { can, type AppRole } from '@/domain/roles'
import type { Organization } from '@/types/database'

const PLAN_LABELS = { starter: 'Starter', pro: 'Pro', business: 'Business' } as const

export function OrganizationSettings({
  organization,
  locationName,
  memberCount,
  role,
}: {
  organization: Organization
  locationName: string | null
  memberCount: number
  role: AppRole
}) {
  const router = useRouter()
  const [name, setName] = useState(organization.name)
  const [pending, startTransition] = useTransition()
  const editable = can(role, 'org:settings')

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Dados da empresa</CardTitle>
          <CardDescription>Como o nome aparece no sistema.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Field label="Nome da empresa" htmlFor="org-name" required>
            <Input
              id="org-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!editable}
            />
          </Field>

          {editable ? (
            <Button
              variant="primary"
              loading={pending}
              disabled={name.trim() === organization.name || name.trim().length < 2}
              onClick={() =>
                startTransition(async () => {
                  const result = await updateOrganization(name)
                  if (!result.ok) {
                    toast.error(result.error ?? 'Não foi possível salvar.')
                    return
                  }
                  toast.success('Empresa atualizada.')
                  router.refresh()
                })
              }
            >
              Salvar
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Unidade</CardTitle>
          <CardDescription>
            Múltiplas unidades chegam em uma próxima versão.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-[14px] font-medium text-[var(--color-ink)]">
            {locationName ?? 'Unidade principal'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Plano</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="accent">{PLAN_LABELS[organization.plan]}</Badge>
            <span className="text-[13px] text-[var(--color-ink-muted)]">
              {memberCount} de {organization.max_users} usuários ·{' '}
              {organization.max_locations} unidade
              {organization.max_locations > 1 ? 's' : ''}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
