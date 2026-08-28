import { useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Plus, ArrowUpCircle, Wrench, BookOpen, Megaphone, Check } from 'lucide-react'
import { Topbar } from '../../components/layout/Topbar'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { cn } from '../../lib/cn'
import { useAuthContext } from '../../context/AuthContext'
import { useMyPermissions } from '../../hooks/usePermissions'
import { ADMINISTRATOR } from '../../api/permissions'
import { useToast } from '../../components/ui/toast-context'
import {
  useAnnounceRelease, useMarkReleaseSeen, useReleaseAnnouncements,
} from '../../hooks/useReleases'
import { RELEASES } from './changelogData'
import { filterReleases } from './docsContent'
import type { ChangelogKind, ChangelogRelease } from '../../types'

const KIND_STYLE: Record<ChangelogKind, { label: string; icon: typeof Plus; fg: string; ring: string }> = {
  added:    { label: 'New',      icon: Plus,          fg: 'text-success', ring: 'border-success/30 bg-success/10' },
  improved: { label: 'Improved', icon: ArrowUpCircle, fg: 'text-info',    ring: 'border-info/30 bg-info/10' },
  fixed:    { label: 'Fixed',    icon: Wrench,        fg: 'text-warning', ring: 'border-warning/30 bg-warning/10' },
}

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

export default function ChangelogPage() {
  const { profile } = useAuthContext()
  const { data: permissions } = useMyPermissions()
  const markSeen = useMarkReleaseSeen()
  const seenRef = useRef(false)

  const can = (feature: string) =>
    !!permissions && (permissions.includes(ADMINISTRATOR) || permissions.includes(feature))
  const canPublish = can('can_publish_releases')

  const releases = useMemo(
    () => filterReleases(RELEASES, profile?.role, can),
    // `can` closes over permissions; listing it is what actually re-runs this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [permissions, profile?.role],
  )

  // Reading the page is what marks it read. Guarded by a ref rather than the
  // mutation's own state so a re-render mid-flight cannot fire it twice.
  const newest = releases[0]?.version
  useEffect(() => {
    if (!newest || seenRef.current || profile?.last_seen_release === newest) return
    seenRef.current = true
    markSeen.mutate(newest)
  }, [newest, profile?.last_seen_release, markSeen])

  return (
    <div className="flex flex-1 flex-col">
      <Topbar title="Changelog" />

      <div className="mx-auto w-full max-w-[1000px] p-4 lg:px-8 lg:py-7">
        <header className="border-b border-border-default pb-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-ui text-[13px] text-text-3">
              Everything that has shipped, newest first. Only the parts that apply to you.
            </p>
            <Link
              to="/docs"
              className="flex items-center gap-1.5 font-ui text-[12.5px] font-medium text-brand-red hover:underline"
            >
              <BookOpen size={13} /> Handbook
            </Link>
          </div>
        </header>

        <div className="mt-7 flex flex-col">
          {releases.map((release, i) => (
            <Release
              key={release.version}
              release={release}
              latest={i === 0}
              canPublish={canPublish}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * Push a release out as a notification to everyone.
 *
 * Separate from the dot on purpose. The dot is passive and costs nobody
 * anything; this interrupts the whole company, so it is a decision somebody
 * makes rather than something that happens on deploy. The server refuses a
 * second attempt at the same version, and the button reflects that.
 */
function AnnounceButton({ release }: { release: ChangelogRelease }) {
  const toast = useToast()
  const announce = useAnnounceRelease()
  const { data: announcements = [] } = useReleaseAnnouncements()
  const already = announcements.find((a) => a.version === release.version)

  if (already) {
    return (
      <span className="inline-flex items-center gap-1.5 font-ui text-[11.5px] text-text-4">
        <Check size={12} /> Announced to {already.recipients}
      </span>
    )
  }

  return (
    <Button
      size="sm"
      variant="secondary"
      iconLeft={<Megaphone size={13} />}
      loading={announce.isPending}
      onClick={() =>
        announce.mutate(
          {
            version: release.version,
            title: `What's new in ${release.version}`,
            body: release.highlight ?? release.title,
          },
          {
            onSuccess: (count) => toast(`Announced to ${count} people`, 'success'),
            onError: (e) =>
              toast(e instanceof Error ? e.message : 'Could not announce this release', 'error'),
          },
        )
      }
    >
      Announce
    </Button>
  )
}

function Release({ release, latest, canPublish }: {
  release: ChangelogRelease
  latest: boolean
  canPublish: boolean
}) {
  return (
    <section
      className={cn(
        'flex flex-col gap-4 border-b border-border-subtle py-6 first:pt-0 last:border-0 sm:flex-row sm:gap-8',
      )}
    >
      {/* Version rail — GitHub puts the tag beside the release, not above it. */}
      <div className="flex shrink-0 flex-row items-center gap-2.5 sm:w-36 sm:flex-col sm:items-start sm:gap-2">
        <span className="font-display text-[16px] font-bold text-text-1">{release.version}</span>
        {latest && <Badge variant="success" size="sm">Latest</Badge>}
        <time dateTime={release.date} className="font-mono text-[11px] text-text-4">
          {formatDate(release.date)}
        </time>
        {canPublish && <AnnounceButton release={release} />}
      </div>

      <div className="min-w-0 flex-1">
        <h2 className="font-display text-[17px] font-bold text-text-1">{release.title}</h2>

        {release.highlight && (
          <p className="mt-2 rounded-md border border-brand-red/25 bg-brand-red/8 px-3 py-2.5 font-ui text-body-sm/relaxed text-text-1">
            {release.highlight}
          </p>
        )}

        <ul className="mt-3.5 flex flex-col gap-2.5">
          {release.entries.map((entry) => {
            const style = KIND_STYLE[entry.kind]
            return (
              <li key={entry.text} className="flex gap-2.5">
                <span
                  className={cn(
                    'mt-px flex h-5 shrink-0 items-center gap-1 rounded-xs border px-1.5 font-mono text-[9.5px] font-semibold uppercase tracking-wider',
                    style.ring, style.fg,
                  )}
                >
                  <style.icon size={9} /> {style.label}
                </span>
                <span className="font-ui text-body-sm/relaxed text-text-2">{entry.text}</span>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
