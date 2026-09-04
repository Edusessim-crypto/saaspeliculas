import { PageContainer } from '@/components/shell/page-header'
import { Card } from '@/components/ui/card'
import { Skeleton, OrderRowSkeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <PageContainer>
      <Skeleton className="h-7 w-32" />
      <div className="mt-3 flex items-center gap-2">
        <Skeleton className="h-9 w-36" />
        <Skeleton className="ml-auto h-9 w-40" />
      </div>
      <Card className="mt-4 overflow-hidden">
        <OrderRowSkeleton count={7} />
      </Card>
    </PageContainer>
  )
}
