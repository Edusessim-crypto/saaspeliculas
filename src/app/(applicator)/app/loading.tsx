import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-lg px-4 py-5">
      <Skeleton className="h-7 w-48" />
      <Skeleton className="mt-2 h-5 w-40" />
      <Skeleton className="mt-5 h-[320px] w-full rounded-[var(--radius-card)]" />
      <Skeleton className="mt-6 h-4 w-24" />
      <div className="mt-2 space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[68px] w-full rounded-[var(--radius-card)]" />
        ))}
      </div>
    </div>
  )
}
