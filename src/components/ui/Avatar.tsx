import { cn } from '../../lib/cn'
import { getInitials } from '../../lib/utils'

const SIZE_CLASSES = {
  xs: 'w-6 h-6 text-[9px]',
  sm: 'w-7 h-7 text-[10px]',
  md: 'w-8 h-8 text-[11px]',
  lg: 'w-10 h-10 text-[13px]',
  xl: 'w-12 h-12 text-[15px]',
}

const GRADIENT_COLORS = [
  'from-brand-red to-red-600',
  'from-service-design-strong to-purple-700',
  'from-service-dev-strong to-cyan-700',
  'from-service-mkt-strong to-amber-600',
  'from-emerald-500 to-green-700',
  'from-blue-500 to-indigo-700',
]

function getGradient(name: string) {
  const index = name.charCodeAt(0) % GRADIENT_COLORS.length
  return GRADIENT_COLORS[index]
}

interface AvatarProps {
  name: string
  size?: keyof typeof SIZE_CLASSES
  online?: boolean
  className?: string
  src?: string
}

export function Avatar({ name, size = 'md', online, className, src }: AvatarProps) {
  return (
    <span className={cn('relative inline-flex flex-shrink-0', className)}>
      {src ? (
        <img
          src={src}
          alt={name}
          className={cn('rounded-full object-cover', SIZE_CLASSES[size])}
        />
      ) : (
        <span
          className={cn(
            'rounded-full bg-gradient-to-br inline-flex items-center justify-center font-ui font-bold text-white flex-shrink-0',
            SIZE_CLASSES[size],
            getGradient(name),
          )}
          title={name}
        >
          {getInitials(name)}
        </span>
      )}
      {online !== undefined && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full border-2 border-bg-base',
            size === 'xs' || size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2',
            online ? 'bg-success' : 'bg-text-4',
          )}
        />
      )}
    </span>
  )
}

interface AvatarGroupProps {
  users: Array<{ id: string; name: string }>
  max?: number
  size?: keyof typeof SIZE_CLASSES
}

export function AvatarGroup({ users, max = 3, size = 'sm' }: AvatarGroupProps) {
  const shown = users.slice(0, max)
  const rest = users.length - max

  return (
    <div className="flex items-center">
      {shown.map((user, i) => (
        <span key={user.id} className={cn('ring-2 ring-bg-base rounded-full', i > 0 && '-ml-2')}>
          <Avatar name={user.name} size={size} />
        </span>
      ))}
      {rest > 0 && (
        <span
          className={cn(
            '-ml-2 rounded-full bg-surface-3 border-2 border-bg-base inline-flex items-center justify-center font-ui font-bold text-text-2',
            SIZE_CLASSES[size],
          )}
        >
          +{rest}
        </span>
      )}
    </div>
  )
}
