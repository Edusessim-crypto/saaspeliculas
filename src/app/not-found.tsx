import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/shell/logo'

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <Logo />
      <h1 className="mt-6 text-[19px] font-semibold text-[var(--color-ink)]">
        Página não encontrada.
      </h1>
      <p className="mt-1.5 text-[13.5px] text-[var(--color-ink-muted)]">
        O endereço acessado não existe ou foi movido.
      </p>
      <Button variant="primary" className="mt-5" asChild>
        <Link href="/hoje">Voltar para Hoje</Link>
      </Button>
    </main>
  )
}
