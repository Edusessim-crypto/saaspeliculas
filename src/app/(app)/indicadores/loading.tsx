import { PageContainer } from '@/components/shell/page-header'
import { Skeleton, CardGridSkeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <PageContainer>
      <Skeleton className="h-7 w-36" />
      <Skeleton className="mt-2 h-4 w-64" />
      <div className="mt-4">
        <CardGridSkeleton />
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Skeleton className="h-[300px] rounded-[var(--radius-card)]" />
        <Skeleton className="h-[300px] rounded-[var(--radius-card)]" />
      </div>
    </PageContainer>
  )
}
