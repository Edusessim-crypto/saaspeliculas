'use client'

import { useTransition } from 'react'
import { Building2, LogOut, ChevronsUpDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { EmployeeAvatar } from '@/components/ui/avatar'
import { signOut } from '@/lib/actions/auth'
import { ROLE_LABELS, type AppRole } from '@/domain/roles'

export function AccountMenu({
  name,
  email,
  role,
  organizationName,
}: {
  name: string
  email: string | null
  role: AppRole
  organizationName: string
}) {
  const [pending, startTransition] = useTransition()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Menu da conta"
          className="inline-flex items-center gap-1.5 rounded-[var(--radius-control)] p-1 transition-colors hover:bg-[var(--color-surface-hover)]"
        >
          <EmployeeAvatar name={name} color="#172554" size="sm" />
          <ChevronsUpDown className="size-3.5 text-[var(--color-ink-subtle)]" aria-hidden />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-60">
        <div className="px-2.5 py-2">
          <p className="truncate text-[13px] font-semibold text-[var(--color-ink)]">{name}</p>
          {email ? (
            <p className="truncate text-[12px] text-[var(--color-ink-muted)]">{email}</p>
          ) : null}
          <p className="mt-1 text-[11px] font-medium text-[var(--color-ink-subtle)]">
            {ROLE_LABELS[role]}
          </p>
        </div>

        <DropdownMenuSeparator />
        <DropdownMenuLabel>Unidade</DropdownMenuLabel>
        <DropdownMenuItem disabled>
          <Building2 />
          <span className="truncate">{organizationName}</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuItem
          destructive
          disabled={pending}
          onSelect={(e) => {
            e.preventDefault()
            startTransition(() => void signOut())
          }}
        >
          <LogOut />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
