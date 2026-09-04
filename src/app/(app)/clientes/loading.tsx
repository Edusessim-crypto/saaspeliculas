import { PageContainer } from '@/components/shell/page-header'
import { Card } from '@/components/ui/card'
import { Skeleton, OrderRowSkeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <PageContainer>
      <Skeleton className="h-7 w-32" />
      <Skeleton className="mt-3 h-11 w-full max-w-md" />
      <Card className="mt-4 overflow-hidden">
        <OrderRowSkeleton count={8} />
      </Card>
    </PageContainer>
  )
}
