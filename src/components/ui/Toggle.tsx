import { cn } from '../../lib/cn'

interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  disabled?: boolean
  size?: 'sm' | 'md'
}

export function Toggle({ checked, onChange, label, disabled, size = 'md' }: ToggleProps) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex items-center rounded-full transition-colors duration-200 focus:outline-none focus:shadow-ring-focus disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0',
        size === 'sm' ? 'w-8 h-4' : 'w-10 h-5',
        checked ? 'bg-brand-red' : 'bg-surface-3',
      )}
    >
      <span
        className={cn(
          'rounded-full bg-white shadow-sm transition-transform duration-200',
          size === 'sm' ? 'w-3 h-3' : 'w-4 h-4',
          checked
            ? size === 'sm' ? 'translate-x-4.5' : 'translate-x-5.5'
            : 'translate-x-0.5',
        )}
      />
    </button>
  )
}
