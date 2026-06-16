import { cn } from '../../lib/cn'

interface SkeletonProps {
  className?: string
  rounded?: 'none' | 'sm' | 'md' | 'full'
}

export function Skeleton({ className, rounded = 'md' }: SkeletonProps) {
  return (
    <div
      className={cn(
        'skeleton',
        {
          'rounded-none': rounded === 'none',
          'rounded-sm': rounded === 'sm',
          'rounded-md': rounded === 'md',
          'rounded-full': rounded === 'full',
        },
        className,
      )}
    />
  )
}

export function SkeletonCard() {
  return (
    <div className="bg-surface-1 border border-border-default rounded-lg p-5 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="size-10" rounded="full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-5/6" />
      <div className="flex gap-2 pt-1">
        <Skeleton className="h-6 w-20" rounded="sm" />
        <Skeleton className="h-6 w-16" rounded="sm" />
      </div>
    </div>
  )
}

export function SkeletonTableRow() {
  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-border-subtle">
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-6 w-24" rounded="sm" />
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-2 w-20 flex-1" />
    </div>
  )
}
