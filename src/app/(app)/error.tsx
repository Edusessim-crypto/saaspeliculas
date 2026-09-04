'use client'

import { useEffect } from 'react'
import { PageContainer } from '@/components/shell/page-header'
import { Card } from '@/components/ui/card'
import { ErrorState } from '@/components/ui/empty-state'

export default function AppError({
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
    <PageContainer>
      <Card>
        <ErrorState onRetry={reset} />
      </Card>
    </PageContainer>
  )
}
