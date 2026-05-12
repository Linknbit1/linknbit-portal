import { cn } from '../../lib/cn'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  children: ReactNode
  loading?: boolean
  iconLeft?: ReactNode
  iconRight?: ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  loading,
  iconLeft,
  iconRight,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 font-ui font-medium transition-colors duration-150 rounded-sm focus:outline-none focus:shadow-ring-focus disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap',
        {
          'bg-brand-red text-white hover:bg-brand-red-hover active:bg-brand-red-press':
            variant === 'primary',
          'bg-surface-2 text-text-1 border border-border-default hover:bg-surface-3':
            variant === 'secondary',
          'bg-transparent text-text-2 hover:bg-surface-2 hover:text-text-1':
            variant === 'ghost',
          'bg-error/10 text-error border border-error/30 hover:bg-error/20':
            variant === 'danger',
        },
        {
          'text-body-sm px-3 h-8': size === 'sm',
          'text-body px-4 h-9': size === 'md',
          'text-body-lg px-5 h-11': size === 'lg',
        },
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        iconLeft
      )}
      {children}
      {!loading && iconRight}
    </button>
  )
}
