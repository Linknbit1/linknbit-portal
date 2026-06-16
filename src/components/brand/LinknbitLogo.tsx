import { cn } from '../../lib/cn'

interface LinknbitMarkProps {
  surface?: 'dark' | 'light'
  className?: string
  imageClassName?: string
}

export function LinknbitMark({ surface = 'dark', className, imageClassName }: LinknbitMarkProps) {
  const src = surface === 'dark' ? '/brand/linknbit-mark-dark.svg' : '/brand/linknbit-mark-light.svg'

  return (
    <span className={cn('flex shrink-0 items-center justify-center overflow-hidden', className)}>
      <img src={src} alt="" className={cn('block size-full object-contain', imageClassName)} />
    </span>
  )
}

interface LinknbitWordmarkProps {
  surface?: 'dark' | 'light'
  className?: string
}

export function LinknbitWordmark({ surface = 'dark', className }: LinknbitWordmarkProps) {
  const src = surface === 'dark' ? '/brand/linknbit-wordmark-dark.svg' : '/brand/linknbit-wordmark-light.svg'

  return <img src={src} alt="Linknbit" className={cn('block object-contain', className)} />
}
