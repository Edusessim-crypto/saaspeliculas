import { PageContainer } from '@/components/shell/page-header'
import { Card } from '@/components/ui/card'
import { Skeleton, CardGridSkeleton, OrderRowSkeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <PageContainer>
      <Skeleton className="h-7 w-44" />
      <Skeleton className="mt-2 h-4 w-56" />
      <div className="mt-4">
        <CardGridSkeleton />
      </div>
      <Card className="mt-5 overflow-hidden">
        <OrderRowSkeleton count={6} />
      </Card>
    </PageContainer>
  )
}
