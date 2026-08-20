import { Globe } from 'lucide-react'
import { socialPlatform } from '../../lib/socialLinks'
import { cn } from '../../lib/cn'

interface SocialBadgeProps {
  url: string
  size?: 'sm' | 'md'
  className?: string
}

/**
 * The platform a social link points at, recognised from the URL.
 *
 * Lucide carries no brand glyphs and the project is Lucide-only, so each
 * platform is drawn as its brand colour behind a short monogram — "in" on
 * LinkedIn blue reads as LinkedIn at 20px, which is the whole job. Anything
 * unrecognised, or an empty field mid-typing, falls back to a plain globe.
 */
export function SocialBadge({ url, size = 'md', className }: SocialBadgeProps) {
  const platform = socialPlatform(url)
  const box = size === 'sm' ? 'size-6 text-[9px]' : 'size-7 text-[10px]'

  if (!platform) {
    return (
      <span
        title={url ? 'Link' : 'Paste a profile link'}
        className={cn(
          'flex shrink-0 items-center justify-center rounded-md border border-border-default bg-surface-2 text-text-4',
          box,
          className,
        )}
      >
        <Globe size={size === 'sm' ? 12 : 14} />
      </span>
    )
  }

  return (
    <span
      title={platform.label}
      aria-label={platform.label}
      // The brand colour is the point of the badge, so it is the one place an
      // inline style is warranted — there is no token for "LinkedIn blue".
      style={{ backgroundColor: platform.color }}
      className={cn(
        'flex shrink-0 items-center justify-center rounded-md font-ui font-bold lowercase text-white',
        box,
        className,
      )}
    >
      {platform.monogram}
    </span>
  )
}
