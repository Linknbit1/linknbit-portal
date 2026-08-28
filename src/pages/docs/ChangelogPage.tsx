import { Link } from 'react-router-dom'
import { Plus, ArrowUpCircle, Wrench, BookOpen } from 'lucide-react'
import { Topbar } from '../../components/layout/Topbar'
import { Badge } from '../../components/ui/Badge'
import { cn } from '../../lib/cn'
import { RELEASES } from './changelogData'
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
  return (
    <div className="flex flex-1 flex-col">
      <Topbar title="Changelog" />

      <div className="mx-auto w-full max-w-[1000px] p-4 lg:px-8 lg:py-7">
        <header className="border-b border-border-default pb-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-ui text-[13px] text-text-3">Everything that has shipped, newest first.</p>
            <Link
              to="/docs"
              className="flex items-center gap-1.5 font-ui text-[12.5px] font-medium text-brand-red hover:underline"
            >
              <BookOpen size={13} /> Handbook
            </Link>
          </div>
        </header>

        <div className="mt-7 flex flex-col">
          {RELEASES.map((release, i) => (
            <Release key={release.version} release={release} latest={i === 0} />
          ))}
        </div>
      </div>
    </div>
  )
}

function Release({ release, latest }: { release: ChangelogRelease; latest: boolean }) {
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
