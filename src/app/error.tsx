'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <h1 className="text-[19px] font-semibold text-[var(--color-ink)]">
        Algo não carregou como esperado.
      </h1>
      <p className="mt-1.5 max-w-sm text-[13.5px] leading-relaxed text-[var(--color-ink-muted)]">
        Tente novamente. Se continuar acontecendo, recarregue a página.
      </p>
      <div className="mt-5 flex gap-2">
        <Button variant="primary" onClick={reset}>
          Tentar novamente
        </Button>
        <Button variant="secondary" onClick={() => window.location.reload()}>
          Recarregar
        </Button>
      </div>
    </main>
  )
}
