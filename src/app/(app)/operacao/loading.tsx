import { PageContainer } from '@/components/shell/page-header'
import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <PageContainer>
      <Skeleton className="h-7 w-36" />
      <Skeleton className="mt-2 h-4 w-56" />
      <div className="mt-5 flex gap-3 overflow-hidden">
        {Array.from({ length: 5 }).map((_, column) => (
          <div key={column} className="w-[272px] shrink-0">
            <Skeleton className="h-4 w-28" />
            <div className="mt-2 space-y-2">
              {Array.from({ length: 2 }).map((_, card) => (
                <Skeleton key={card} className="h-[132px] w-full rounded-[10px]" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </PageContainer>
  )
}
