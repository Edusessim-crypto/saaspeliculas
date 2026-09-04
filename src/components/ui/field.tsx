import * as React from 'react'
import { cn } from '@/lib/utils'
import { Label } from './label'

interface FieldProps {
  label: string
  htmlFor?: string
  required?: boolean
  error?: string
  hint?: string
  className?: string
  children: React.ReactNode
}

export function Field({
  label,
  htmlFor,
  required,
  error,
  hint,
  className,
  children,
}: FieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label htmlFor={htmlFor} required={required}>
        {label}
      </Label>
      {children}
      {error ? (
        <p role="alert" className="text-[12px] font-medium text-[var(--color-danger)]">
          {error}
        </p>
      ) : hint ? (
        <p className="text-[12px] text-[var(--color-ink-subtle)]">{hint}</p>
      ) : null}
    </div>
  )
}
