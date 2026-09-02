import { Link } from 'react-router-dom'
import {
  BookOpen, Tag, Quote, Check, CircleDashed, Circle, AlertTriangle, ArrowRight,
} from 'lucide-react'
import { Topbar } from '../../components/layout/Topbar'
import { cn } from '../../lib/cn'
import {
  MODULES, ONE_LINE_PITCH, ROADMAP, THE_PROBLEM, WHAT_THIS_IS, WHERE_WE_STAND, WHO_ITS_FOR,
} from './productPurposeContent'
import type { BuildState } from '../../types'

const STATE_STYLE: Record<BuildState, { label: string; icon: typeof Check; className: string }> = {
  live:    { label: 'Live',      icon: Check,         className: 'border-success/30 bg-success/10 text-success' },
  partial: { label: 'Partial',   icon: CircleDashed,  className: 'border-warning/30 bg-warning/10 text-warning' },
  planned: { label: 'Not built', icon: Circle,        className: 'border-border-default bg-surface-2 text-text-3' },
}

function StateChip({ state }: { state: BuildState }) {
  const { label, icon: Icon, className } = STATE_STYLE[state]
  return (
    <span className={cn('inline-flex shrink-0 items-center gap-1 rounded-sm border px-1.5 py-0.5 font-mono text-[9.5px] font-semibold uppercase tracking-wider', className)}>
      <Icon size={10} /> {label}
    </span>
  )
}

function SectionHeading({ index, title, lede }: { index: string; title: string; lede?: string }) {
  return (
    <div className="mb-4">
      <div className="flex items-baseline gap-2.5">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-text-4">{index}</span>
        <h2 className="font-display text-[17px] font-bold text-text-1">{title}</h2>
      </div>
      {lede && <p className="mt-1.5 font-ui text-body-sm/relaxed text-text-3">{lede}</p>}
    </div>
  )
}

/**
 * The third docs page, for two readers at once: somebody being pitched the
 * product, and the person building it. The build-state chips are what let one
 * page serve both — a buyer reads what they get, the owner reads how far along
 * it is, and neither has to trust a claim the other half quietly softened.
 */
export default function ProductPurposePage() {
  return (
    <div className="flex flex-1 flex-col">
      <Topbar title="Product purpose" />

      <div className="mx-auto w-full max-w-[1000px] p-4 lg:px-8 lg:py-7">
        <header className="border-b border-border-default pb-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-ui text-[13px] text-text-3">
              What this portal is, who it is for, and how far along it is. A four-minute read.
            </p>
            <div className="flex items-center gap-4">
              <Link to="/docs" className="flex items-center gap-1.5 font-ui text-[12.5px] font-medium text-brand-red hover:underline">
                <BookOpen size={13} /> Handbook
              </Link>
              <Link to="/docs/changelog" className="flex items-center gap-1.5 font-ui text-[12.5px] font-medium text-brand-red hover:underline">
                <Tag size={13} /> What&rsquo;s new
              </Link>
            </div>
          </div>
        </header>

        {/* ── The pitch ─────────────────────────────────────────────────── */}
        <section className="mt-7 rounded-xl border border-border-default bg-surface-1 p-5 lg:p-6">
          <div className="flex items-start gap-3">
            <Quote size={18} className="mt-0.5 shrink-0 text-brand-red" />
            <p className="font-display text-[17px] font-bold leading-snug text-text-1 lg:text-[19px]">
              {ONE_LINE_PITCH}
            </p>
          </div>
        </section>

        {/* ── 1. What this is ───────────────────────────────────────────── */}
        <section className="mt-8">
          <SectionHeading index="01" title="What this is" />
          <p className="font-ui text-[13.5px]/relaxed text-text-2">{WHAT_THIS_IS}</p>
        </section>

        {/* ── 2. Who it's for ───────────────────────────────────────────── */}
        <section className="mt-8">
          <SectionHeading index="02" title="Who it is for" />
          <ul className="flex flex-col gap-2.5">
            {WHO_ITS_FOR.map((line) => (
              <li key={line} className="flex gap-2.5 font-ui text-body-sm/relaxed text-text-2">
                <ArrowRight size={14} className="mt-1 shrink-0 text-text-4" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* ── 3. The problem ────────────────────────────────────────────── */}
        <section className="mt-8">
          <SectionHeading
            index="03"
            title="Why not just use ClickUp"
            lede="This is the whole argument. Everything else on this page is evidence for it."
          />
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-lg border border-border-default bg-surface-inset p-4">
              <h3 className="font-ui text-[13px] font-semibold text-text-2">{THE_PROBLEM.them.title}</h3>
              <ul className="mt-3 flex flex-col gap-2.5">
                {THE_PROBLEM.them.points.map((p) => (
                  <li key={p} className="font-ui text-[12.5px]/relaxed text-text-3">{p}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg border border-brand-red/30 bg-brand-red/6 p-4">
              <h3 className="font-ui text-[13px] font-semibold text-text-1">{THE_PROBLEM.us.title}</h3>
              <ul className="mt-3 flex flex-col gap-2.5">
                {THE_PROBLEM.us.points.map((p) => (
                  <li key={p} className="font-ui text-[12.5px]/relaxed text-text-2">{p}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ── 4. What you can do with it ────────────────────────────────── */}
        <section className="mt-8">
          <SectionHeading
            index="04"
            title="What you can do with it"
            lede="Module by module, with what a team stops using when they adopt it. The chip on each row is the honest build state, not a promise."
          />
          <div className="overflow-hidden rounded-lg border border-border-default bg-surface-1">
            <div className="divide-y divide-border-subtle">
              {MODULES.map((m) => (
                <article key={m.name} className="p-4 lg:p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display text-[14px] font-bold text-text-1">{m.name}</h3>
                    <StateChip state={m.state} />
                  </div>
                  <p className="mt-1 font-mono text-[10.5px] uppercase tracking-wider text-text-4">
                    Replaces: <span className="text-text-3">{m.replaces}</span>
                  </p>
                  <p className="mt-2 font-ui text-[12.5px]/relaxed text-text-2">{m.contains}</p>
                  {m.gap && (
                    <p className="mt-2.5 flex gap-2 rounded-md border border-warning/25 bg-warning/[0.07] px-3 py-2 font-ui text-caption/relaxed text-text-2">
                      <AlertTriangle size={13} className="mt-0.5 shrink-0 text-warning" />
                      <span>{m.gap}</span>
                    </p>
                  )}
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── 5. Where we stand, and where this goes ────────────────────── */}
        <section className="mt-8">
          <SectionHeading
            index="05"
            title="Where we stand, and where this is going"
            lede="The owner half of this page. Re-read it in three months: if the partial rows have not moved, we are not on track."
          />
          <p className="rounded-lg border border-border-default bg-surface-inset p-4 font-ui text-body-sm/relaxed text-text-2">
            {WHERE_WE_STAND}
          </p>

          <div className="mt-4 flex flex-col gap-2.5">
            {ROADMAP.map((item) => (
              <article key={item.title} className="rounded-lg border border-border-default bg-surface-1 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-ui text-[13px] font-semibold text-text-1">{item.title}</h3>
                  <StateChip state={item.state} />
                  {item.toConfirm && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-sm border border-info/30 bg-info/10 px-1.5 py-0.5 font-mono text-[9.5px] font-semibold uppercase tracking-wider text-info">
                      To confirm
                    </span>
                  )}
                </div>
                <p className="mt-1.5 font-ui text-[12.5px]/relaxed text-text-2">{item.detail}</p>
              </article>
            ))}
          </div>

          <p className="mt-4 font-ui text-caption/relaxed text-text-4">
            &ldquo;To confirm&rdquo; means the item was inferred from the codebase rather than decided by the
            product owner. Decide it, and drop the flag.
          </p>
        </section>
      </div>
    </div>
  )
}
