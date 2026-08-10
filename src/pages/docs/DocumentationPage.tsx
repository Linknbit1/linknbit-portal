import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Search, Sparkles, ArrowRight, MapPin, Info } from 'lucide-react'
import { Topbar } from '../../components/layout/Topbar'
import { Badge } from '../../components/ui/Badge'
import { useAuthContext } from '../../context/AuthContext'
import { useMyPermissions } from '../../hooks/usePermissions'
import { ADMINISTRATOR } from '../../api/permissions'
import { cn } from '../../lib/cn'
import { DOC_CHAPTERS, filterChapters } from './docsContent'
import { RELEASES } from './changelogData'
import type { DocChapter, DocTopic } from '../../types'

/** Case-insensitive match across everything a reader might search for. */
function topicMatches(topic: DocTopic, q: string): boolean {
  if (!q) return true
  const haystack = [
    topic.title,
    topic.summary,
    topic.where ?? '',
    ...(topic.notes ?? []),
    ...(topic.procedures ?? []).flatMap((p) => [p.title, ...p.steps]),
  ].join(' ').toLowerCase()
  return haystack.includes(q)
}

export default function DocumentationPage() {
  const { profile } = useAuthContext()
  const { data: permissions } = useMyPermissions()
  const [query, setQuery] = useState('')

  const chapters = useMemo(() => {
    const can = (feature: string) =>
      !!permissions && (permissions.includes(ADMINISTRATOR) || permissions.includes(feature))
    return filterChapters(DOC_CHAPTERS, profile?.role, can)
  }, [permissions, profile?.role])

  const q = query.trim().toLowerCase()
  const visible = useMemo(
    () =>
      chapters.flatMap((chapter) => {
        const topics = chapter.topics.filter((topic) => topicMatches(topic, q))
        return topics.length > 0 ? [{ ...chapter, topics }] : []
      }),
    [chapters, q],
  )

  const latest = RELEASES[0]

  return (
    <div className="flex flex-1 flex-col">
      <Topbar title="Documentation" />

      <div className="mx-auto w-full max-w-[1200px] p-4 lg:px-8 lg:py-7">
        {/* Masthead */}
        <header className="border-b border-border-default pb-5">
          <div className="flex items-center gap-2.5">
            <BookOpen size={18} className="text-brand-red" />
            <h1 className="font-display text-[26px] font-bold text-text-1">Portal handbook</h1>
          </div>
          <p className="mt-1.5 max-w-2xl font-ui text-[13.5px] text-text-2">
            How to use the Linknbit Operations Portal, written for the way you actually work.
            You are seeing the sections available to your role.
          </p>
        </header>

        {/* What's new — the newest release, linking on to the full changelog. */}
        {latest?.highlight && (
          <Link
            to="/docs/changelog"
            className="mt-5 flex flex-col gap-2 rounded-lg border border-brand-red/30 bg-brand-red/8 p-4 transition-colors hover:border-brand-red/50 sm:flex-row sm:items-center sm:gap-4"
          >
            <div className="flex shrink-0 items-center gap-2">
              <Sparkles size={15} className="text-brand-red" />
              <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-brand-red">
                What&rsquo;s new
              </span>
              <Badge variant="default" size="sm">{latest.version}</Badge>
            </div>
            <p className="min-w-0 flex-1 font-ui text-[13px] text-text-1">
              <span className="font-semibold">{latest.title}.</span>{' '}
              <span className="text-text-2">{latest.highlight}</span>
            </p>
            <span className="flex shrink-0 items-center gap-1 font-ui text-[12px] font-medium text-brand-red">
              Changelog <ArrowRight size={13} />
            </span>
          </Link>
        )}

        <div className="mt-6 flex flex-col gap-8 lg:flex-row lg:gap-10">
          {/* Contents — sticky beside the article on desktop, inline above it on mobile. */}
          <nav
            aria-label="Contents"
            className="shrink-0 lg:sticky lg:top-6 lg:h-fit lg:w-56 lg:self-start"
          >
            <p className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-text-4">
              Contents
            </p>
            <ul className="flex flex-col gap-px">
              {visible.map((chapter) => (
                <li key={chapter.id}>
                  <a
                    href={`#${chapter.id}`}
                    className="block rounded-sm px-2.5 py-1.5 font-ui text-[12.5px] text-text-2 transition-colors hover:bg-surface-2 hover:text-text-1"
                  >
                    {chapter.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="min-w-0 flex-1">
            {/* Search */}
            <div className="relative mb-6">
              <Search size={14} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-text-4" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search the handbook…"
                aria-label="Search the handbook"
                className="w-full rounded-md border border-border-default bg-surface-inset py-2 pr-3 pl-9 font-ui text-[13px] text-text-1 outline-none transition-colors placeholder:text-text-4 hover:border-border-strong focus:border-border-focus"
              />
            </div>

            {visible.length === 0 ? (
              <p className="py-14 text-center font-ui text-[13px] text-text-4">
                {q
                  ? `Nothing in the handbook matches “${query}”.`
                  : 'Loading the handbook…'}
              </p>
            ) : (
              <div className="flex flex-col gap-10">
                {visible.map((chapter) => <Chapter key={chapter.id} chapter={chapter} />)}
              </div>
            )}

            <footer className="mt-12 border-t border-border-default pt-5">
              <p className="font-ui text-[12.5px] text-text-3">
                Something here out of date, or a screen missing?{' '}
                <Link to="/docs/changelog" className="text-brand-red hover:underline">
                  Check the changelog
                </Link>{' '}
                — and tell whoever shipped it, so the handbook gets fixed with the feature.
              </p>
            </footer>
          </div>
        </div>
      </div>
    </div>
  )
}

function Chapter({ chapter }: { chapter: DocChapter }) {
  return (
    <section id={chapter.id} className="scroll-mt-6">
      {/* GitHub's rule: a heading owns the line, with a hairline under it. */}
      <h2 className="border-b border-border-default pb-2 font-display text-[20px] font-bold text-text-1">
        {chapter.title}
      </h2>
      <p className="mt-2 font-ui text-[13px] text-text-3">{chapter.blurb}</p>

      <div className="mt-5 flex flex-col gap-5">
        {chapter.topics.map((topic) => <Topic key={topic.id} topic={topic} />)}
      </div>
    </section>
  )
}

function Topic({ topic }: { topic: DocTopic }) {
  return (
    <article id={topic.id} className="scroll-mt-6 rounded-lg border border-border-default bg-surface-1">
      <div className="border-b border-border-subtle px-4 py-3">
        <h3 className="font-display text-[15px] font-bold text-text-1">{topic.title}</h3>
        {topic.where && (
          <p className="mt-1 flex items-center gap-1.5 font-mono text-[11px] text-text-4">
            <MapPin size={11} className="shrink-0" /> {topic.where}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-4 px-4 py-3.5">
        <p className="font-ui text-body-sm/relaxed text-text-2">{topic.summary}</p>

        {topic.procedures?.map((procedure) => (
          <div key={procedure.title}>
            <p className="mb-2 font-ui text-[12.5px] font-semibold text-text-1">{procedure.title}</p>
            <ol className="flex flex-col gap-1.5">
              {procedure.steps.map((step, i) => (
                <li key={step} className="flex gap-2.5">
                  <span
                    aria-hidden
                    className="mt-px flex size-4.5 shrink-0 items-center justify-center rounded-full bg-surface-3 font-mono text-[9.5px] font-semibold text-text-2"
                  >
                    {i + 1}
                  </span>
                  <span className="font-ui text-[12.5px] leading-relaxed text-text-2">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        ))}

        {topic.notes && topic.notes.length > 0 && (
          <div className="rounded-md border border-info/25 bg-info/8 px-3 py-2.5">
            <p className="mb-1.5 flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-info">
              <Info size={11} /> Good to know
            </p>
            <ul className="flex flex-col gap-1">
              {topic.notes.map((note) => (
                <li key={note} className={cn('font-ui text-[12.5px] leading-relaxed text-text-2', 'before:mr-1.5 before:text-text-4 before:content-["•"]')}>
                  {note}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </article>
  )
}
