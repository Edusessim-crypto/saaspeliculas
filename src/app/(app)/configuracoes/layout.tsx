import { PageContainer } from '@/components/shell/page-header'
import { SettingsNav } from '@/components/settings/settings-nav'

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <PageContainer>
      <h1 className="text-[19px] font-semibold tracking-[-0.02em] text-[var(--color-ink)] sm:text-[21px]">
        Configurações
      </h1>
      <p className="mt-0.5 text-[13px] text-[var(--color-ink-muted)]">
        Ajuste a empresa, a equipe e o catálogo de serviços.
      </p>

      <div className="mt-4 grid gap-5 lg:grid-cols-[212px_1fr]">
        <SettingsNav />
        <div className="min-w-0">{children}</div>
      </div>
    </PageContainer>
  )
}
