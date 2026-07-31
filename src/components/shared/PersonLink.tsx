import { useRef, useState, type ReactNode, type MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '../../lib/cn'
import { UserProfileCard } from './UserProfileCard'

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
  /** Skip the profile card and go straight to the full profile page. */
  navigateOnly?: boolean
}

// One place to make an employee name or avatar show their profile. Used across
// the internal portal wherever a person appears (task assignees, rosters,
// comments, attendance, leaderboard, chat…). Not used in the client portal.
//
// A plain click opens a profile card in place instead of navigating, so you
// never lose the page you were on — the card links onward to the full profile.
// It stays a real <a>, so modifier-click / middle-click / "open in new tab" and
// keyboard and screen-reader semantics all keep working.
export function PersonLink({
  personId, children, className, stopPropagation = true, ariaLabel, navigateOnly,
}: PersonLinkProps) {
  const [open, setOpen] = useState(false)
  const anchorRef = useRef<HTMLAnchorElement>(null)

  if (!personId) return <>{children}</>

  return (
    <>
      <Link
        ref={anchorRef}
        to={memberPath(personId)}
        aria-label={ariaLabel}
        onClick={(e: MouseEvent) => {
          if (stopPropagation) e.stopPropagation()
          if (navigateOnly) return
          // Leave new-tab / new-window intents to the browser.
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
          e.preventDefault()
          setOpen((v) => !v)
        }}
        className={cn(
          'rounded-xs outline-none hover:underline underline-offset-2 focus-visible:underline',
          className,
        )}
      >
        {children}
      </Link>

      {!navigateOnly && (
        <UserProfileCard
          profileId={personId}
          open={open}
          onClose={() => setOpen(false)}
          anchorRef={anchorRef}
        />
      )}
    </>
  )
}
