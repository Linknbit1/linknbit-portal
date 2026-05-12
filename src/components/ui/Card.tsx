import { cn } from '../../lib/cn'
import type { HTMLAttributes, ReactNode } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  elevated?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

export function Card({ children, elevated, padding = 'md', className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border',
        elevated
          ? 'bg-surface-2 border-border-default shadow-md'
          : 'bg-surface-1 border-border-default shadow-sm',
        {
          'p-0': padding === 'none',
          'p-3': padding === 'sm',
          'p-5': padding === 'md',
          'p-6': padding === 'lg',
        },
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
