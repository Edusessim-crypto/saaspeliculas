import type { Metadata } from 'next'
import { Suspense } from 'react'
import { LoginForm } from './login-form'
import { Logo } from '@/components/shell/logo'
import { Skeleton } from '@/components/ui/skeleton'

export const metadata: Metadata = { title: 'Entrar' }

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-[var(--color-surface)] px-4 py-10">
      <div className="w-full max-w-[400px]">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>

        <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-5 shadow-[var(--shadow-raised)] sm:p-6">
          <h1 className="text-[19px] font-semibold tracking-[-0.02em] text-[var(--color-ink)]">
            Bem-vindo de volta
          </h1>
          <p className="mt-1 text-[13.5px] text-[var(--color-ink-muted)]">
            Entre para acompanhar sua operação.
          </p>

          <Suspense fallback={<LoginFormFallback />}>
            <LoginForm />
          </Suspense>
        </div>

        <p className="mt-5 text-center text-[12px] text-[var(--color-ink-subtle)]">
          FilmFlow — a operação da sua loja em uma única tela.
        </p>
      </div>
    </main>
  )
}

function LoginFormFallback() {
  return (
    <div className="mt-5 space-y-4" aria-hidden>
      <Skeleton className="h-[68px] w-full" />
      <Skeleton className="h-[68px] w-full" />
      <Skeleton className="h-11 w-full" />
    </div>
  )
}
