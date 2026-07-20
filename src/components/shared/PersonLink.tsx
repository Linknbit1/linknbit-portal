import type { ReactNode, MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '../../lib/cn'

/** Canonical path to a member's public profile page. */
function memberPath(personId: string): string {
  return `/members/${personId}`
}

interface PersonLinkProps {
  /** Profile id to link to. When absent, children render without a link. */
  personId: string | null | undefined
  children: ReactNode
  className?: string
  /**
   * Stop click propagation so the link works inside a clickable row/card without
   * also triggering the parent's onClick. Defaults to true.
   */
  stopPropagation?: boolean
  /** Screen-reader label; defaults to a generic profile label. */
  ariaLabel?: string
}

// One place to make an employee name or avatar navigate to their profile. Used
// across the internal portal wherever a person is shown (task assignees, rosters,
// comments, attendance, leaderboard, etc.). Not used in the client portal.
export function PersonLink({ personId, children, className, stopPropagation = true, ariaLabel }: PersonLinkProps) {
  if (!personId) return <>{children}</>
  return (
    <Link
      to={memberPath(personId)}
      aria-label={ariaLabel}
      onClick={(e: MouseEvent) => { if (stopPropagation) e.stopPropagation() }}
      className={cn(
        'rounded-xs outline-none hover:underline underline-offset-2 focus-visible:underline',
        className,
      )}
    >
      {children}
    </Link>
  )
}
