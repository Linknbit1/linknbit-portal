import { cn } from '../../lib/cn'
import type { InputHTMLAttributes, ReactNode } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helper?: string
  iconLeft?: ReactNode
  iconRight?: ReactNode
  inputClassName?: string
}

export function Input({
  label,
  error,
  helper,
  iconLeft,
  iconRight,
  className,
  inputClassName,
  id,
  ...props
}: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={inputId} className="text-label font-ui font-semibold text-text-2 uppercase tracking-wider">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {iconLeft && (
          <span className="absolute left-3 text-text-3 pointer-events-none">{iconLeft}</span>
        )}
        <input
          id={inputId}
          className={cn(
            'w-full bg-surface-inset border rounded-md font-ui text-body text-text-1 placeholder:text-text-3 transition-colors duration-150',
            'focus:outline-none focus:border-border-focus focus:shadow-ring-focus',
            error ? 'border-error/60' : 'border-border-default',
            iconLeft ? 'pl-9' : 'pl-3',
            iconRight ? 'pr-9' : 'pr-3',
            'py-2 h-9',
            inputClassName,
          )}
          {...props}
        />
        {iconRight && (
          <span className="absolute right-3 text-text-3 pointer-events-none">{iconRight}</span>
        )}
      </div>
      {error && <p className="text-caption text-error">{error}</p>}
      {helper && !error && <p className="text-caption text-text-3">{helper}</p>}
    </div>
  )
}
