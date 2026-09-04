import { PageContainer } from '@/components/shell/page-header'
import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <PageContainer>
      <Skeleton className="h-7 w-28" />
      <Skeleton className="mt-2 h-4 w-44" />
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[172px] w-full rounded-[var(--radius-card)]" />
        ))}
      </div>
    </PageContainer>
  )
}
