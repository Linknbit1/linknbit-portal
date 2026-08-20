import { Fragment, useEffect, useMemo, useState } from 'react'
import {
  Plus, Search, Target, Columns3, Table2, CalendarClock,
  AlertTriangle, MessageSquare, ChevronLeft, SlidersHorizontal, Upload,
} from 'lucide-react'
import { Topbar } from '../../components/layout/Topbar'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Avatar } from '../../components/ui/Avatar'
import { ViewToggle, type ViewToggleOption } from '../../components/ui/ViewToggle'
import { ResponsiveTable } from '../../components/ui/ResponsiveTable'
import { useToast } from '../../components/ui/toast-context'
import { StageChip, ChannelChip, TemperatureChip, IcpFitChip } from '../../components/shared/BdChips'
import { STAGE_CONFIG, STAGE_ORDER } from '../../constants/bd'
import { useBd } from '../../context/BdContext'
import { useDragScroll } from '../../hooks/useDragScroll'
import { cn } from '../../lib/cn'
import { formatCompactCurrency, formatDate, getDaysUntil } from '../../lib/utils'
import { LeadDrawer } from './LeadDrawer'
import { LeadFormModal } from './LeadFormModal'
import { LeadImportModal } from './LeadImportModal'
import { LogActivityModal } from './LogActivityModal'
import { HandoffModal } from './HandoffModal'
import type { Lead, LeadStage } from '../../types'

type PipelineView = 'board' | 'table'

const PIPELINE_VIEWS: ViewToggleOption<PipelineView>[] = [
  { value: 'board', label: 'Board', icon: Columns3 },
  { value: 'table', label: 'Table', icon: Table2 },
]

const SORTS = [
  // First and default: the stored board order, the only mode in which dragging a
  // card up or down can stick. Every other option is computed, so a manual
  // placement would be thrown away on the next render.
  { value: 'manual', label: 'Manual order' },
  { value: 'value', label: 'Highest value' },
  { value: 'followup', label: 'Follow-up date' },
  { value: 'recent', label: 'Recently contacted' },
  { value: 'company', label: 'Company A–Z' },
]

/** Still in play. Won, Lost and Unqualified are the three terminal stages. */
const OPEN_STAGES: LeadStage[] = ['new', 'contacted', 'qualified', 'meeting', 'proposal_sent', 'negotiation']

/** Where a drop would land: a column, and the slot it would occupy. */
interface DropAt {
  stage: LeadStage
  /** Index within the column, ignoring the card being dragged. */
  index: number
}

/**
 * Which slot the pointer is asking for, measured off the cards actually on
 * screen: the first one whose middle is below the cursor, or the end.
 *
 * Reading live geometry is what keeps this stable. The slot is exactly as tall
 * as the card in hand, so opening it never changes the column's total height —
 * and when the slot does move past a card, that card shifts *away* from the
 * cursor, which pushes the decision further into the answer it just gave rather
 * than back the way it came.
 */
function dropIndexAt(list: HTMLElement, clientY: number, stage: LeadStage, dragId: string): DropAt {
  const cards = Array.from(list.querySelectorAll<HTMLElement>('[data-lead-card]'))
    .filter((el) => el.dataset.leadCard !== dragId)
  for (let i = 0; i < cards.length; i++) {
    const rect = cards[i].getBoundingClientRect()
    if (clientY < rect.top + rect.height / 2) return { stage, index: i }
  }
  return { stage, index: cards.length }
}

/** True when two drop targets mean the same thing — used to skip no-op renders. */
function sameDropAt(a: DropAt | null, b: DropAt): boolean {
  return !!a && a.stage === b.stage && a.index === b.index
}

type FollowUpTone = 'overdue' | 'today' | 'soon' | 'later'

function followUpTone(date: string | null): FollowUpTone | null {
  if (!date) return null
  const days = getDaysUntil(date)
  if (days < 0) return 'overdue'
  if (days === 0) return 'today'
  if (days <= 2) return 'soon'
  return 'later'
}

const FOLLOW_UP_CLASSES: Record<FollowUpTone, string> = {
  overdue: 'text-error',
  today: 'text-warning',
  soon: 'text-text-2',
  later: 'text-text-3',
}

/** Days a lead has been sitting where it is — the number that exposes a stall. */
function daysSince(date: string): number {
  return Math.max(0, -getDaysUntil(date))
}

export default function PipelinePage() {
  const toast = useToast()
  const { leads, moveLead, people, avatarOf } = useBd()

  const [search, setSearch] = useState('')
  const [owner, setOwner] = useState('all')
  const [sort, setSort] = useState('manual')
  const [view, setView] = useState<PipelineView>('board')
  const [collapsed, setCollapsed] = useState<LeadStage[]>([])

  const [openLeadId, setOpenLeadId] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [editing, setEditing] = useState<Lead | null>(null)
  const [activityFor, setActivityFor] = useState<Lead | null>(null)
  // Winning a deal is the one stage change with a next step attached.
  const [handoffFor, setHandoffFor] = useState<Lead | null>(null)

  const [dragId, setDragId] = useState<string | null>(null)
  const [dropAt, setDropAt] = useState<DropAt | null>(null)
  /** Height of the card in hand, so the slot it will drop into is its own size. */
  const [dragHeight, setDragHeight] = useState(0)
  const boardRef = useDragScroll<HTMLDivElement>()

  // Reordering is only offered under Manual order — see SORTS.
  const reorderable = sort === 'manual'
  const endDrag = () => { setDragId(null); setDropAt(null) }

  // The card being dragged is taken out of the column, so the ones under it
  // close up. If the pointer leaves the window and the button is released
  // there, neither drop nor the card's own dragend reaches us — without this
  // the board would keep a hole in it until the next click.
  useEffect(() => {
    if (!dragId) return
    const end = () => endDrag()
    window.addEventListener('dragend', end)
    window.addEventListener('drop', end)
    return () => {
      window.removeEventListener('dragend', end)
      window.removeEventListener('drop', end)
    }
  }, [dragId])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const rows = leads.filter((lead) => {
      if (owner !== 'all' && lead.ownerId !== owner) return false
      if (!q) return true
      return (
        lead.company.toLowerCase().includes(q) ||
        lead.contactName.toLowerCase().includes(q) ||
        lead.industry.toLowerCase().includes(q)
      )
    })
    // 'manual' deliberately sorts nothing: fetchLeads already returns the board
    // order, and re-sorting here is what would undo a drag.
    const sorted = [...rows]
    if (sort === 'value') sorted.sort((a, b) => b.value - a.value)
    if (sort === 'company') sorted.sort((a, b) => a.company.localeCompare(b.company))
    // Never contacted sinks to the bottom rather than sorting as "longest ago",
    // mirroring the follow-up sort. An empty string loses to every real date.
    if (sort === 'recent') sorted.sort((a, b) => (b.lastContacted ?? '').localeCompare(a.lastContacted ?? ''))
    if (sort === 'followup') {
      // Leads with no follow-up sink to the bottom rather than sorting as "oldest".
      sorted.sort((a, b) => (a.nextFollowUp ?? '9999').localeCompare(b.nextFollowUp ?? '9999'))
    }
    return sorted
  }, [leads, search, owner, sort])

  const stats = useMemo(() => {
    const open = filtered.filter((l) => OPEN_STAGES.includes(l.stage))
    const won = filtered.filter((l) => l.stage === 'won')
    const lost = filtered.filter((l) => l.stage === 'lost')
    const resolved = won.length + lost.length
    return {
      openValue: open.reduce((sum, l) => sum + l.value, 0),
      openCount: open.length,
      winRate: resolved === 0 ? 0 : Math.round((won.length / resolved) * 100),
      avgDeal: won.length === 0 ? 0 : Math.round(won.reduce((s, l) => s + l.value, 0) / won.length),
      needsFollowUp: open.filter((l) => {
        const tone = followUpTone(l.nextFollowUp)
        return tone === 'overdue' || tone === 'today'
      }).length,
    }
  }, [filtered])

  const byStage = useMemo(() => {
    const map = {} as Record<LeadStage, Lead[]>
    for (const stage of STAGE_ORDER) map[stage] = []
    for (const lead of filtered) map[lead.stage]?.push(lead)
    return map
  }, [filtered])

  const openLead = openLeadId ? leads.find((l) => l.id === openLeadId) ?? null : null

  /** `lane` excludes the card in hand, so a drop index maps straight to a slot. */
  const handleDrop = (stage: LeadStage, lane: Lead[]) => {
    const id = dragId
    const at = dropAt
    endDrag()
    if (!id) return
    const lead = leads.find((l) => l.id === id)
    if (!lead) return

    const sameStage = lead.stage === stage
    // A drop inside the same column with nothing to reorder is not a move.
    if (sameStage && !reorderable) return

    // Under a computed sort the visible order is not the stored order, so a slot
    // index would name the wrong neighbour — a cross-column drop appends instead.
    const index = reorderable && at && at.stage === stage ? at.index : lane.length
    const beforeId = lane[index]?.id ?? null

    moveLead(id, stage, beforeId, stage === 'lost' ? 'No response' : undefined)
    if (!sameStage) {
      toast(`${lead.company} → ${STAGE_CONFIG[stage].label}`, stage === 'won' ? 'success' : 'info')
      if (stage === 'won' && !lead.handoffId) setHandoffFor({ ...lead, stage })
    }
  }

  const toggleColumn = (stage: LeadStage) =>
    setCollapsed((c) => (c.includes(stage) ? c.filter((s) => s !== stage) : [...c, stage]))

  return (
    <div className={cn('flex flex-1 flex-col', view === 'board' && 'min-h-0')}>
      <Topbar title="Pipeline" />
      <div className={cn('flex flex-col gap-6 p-4 lg:px-8 lg:py-7', view === 'board' && 'min-h-0 flex-1')}>
        {/* ── Header ── */}
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          <div>
            <h2 className="font-display text-[20px] font-bold text-text-1">Pipeline</h2>
            <p className="font-ui text-[13px] text-text-3">
              {filtered.length} lead{filtered.length !== 1 ? 's' : ''}
              {stats.needsFollowUp > 0 && (
                <span className="text-warning"> · {stats.needsFollowUp} need following up</span>
              )}
            </p>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search leads…"
              iconLeft={<Search size={14} />}
              className="w-full sm:w-48"
            />
            <Select
              value={owner}
              onChange={setOwner}
              size="sm"
              className="w-36"
              options={[{ value: 'all', label: 'All reps' }, ...people.map((p) => ({ value: p.id, label: p.name }))]}
            />
            <Select value={sort} onChange={setSort} options={SORTS} size="sm" className="w-44" />
            <ViewToggle value={view} onChange={setView} options={PIPELINE_VIEWS} className="hidden lg:flex" />
            <Button
              variant="secondary"
              size="sm"
              iconLeft={<Upload size={15} />}
              onClick={() => setImportOpen(true)}
            >
              Import CSV
            </Button>
            <Button size="sm" iconLeft={<Plus size={15} />} onClick={() => { setEditing(null); setFormOpen(true) }}>
              New Lead
            </Button>
          </div>
        </div>

        {/* ── Funnel strip: proportions across the five open stages ── */}
        <FunnelStrip byStage={byStage} stats={stats} />

        {/* ── Board ── */}
        {view === 'board' ? (
          <div
            ref={boardRef}
            className="-mx-4 flex min-h-80 flex-1 gap-3 overflow-x-auto px-4 pb-3 no-scrollbar lg:mx-0 lg:px-0"
          >
            {STAGE_ORDER.map((stage) => {
              const config = STAGE_CONFIG[stage]
              const columnLeads = byStage[stage]
              const value = columnLeads.reduce((sum, l) => sum + l.value, 0)
              const StageIcon = config.icon
              const isCollapsed = collapsed.includes(stage)
              const isTerminal = stage === 'won' || stage === 'lost' || stage === 'unqualified'
              // The column as it will be once the dragged card leaves its old
              // slot — this is what drop indices are measured against.
              const lane = columnLeads.filter((l) => l.id !== dragId)
              const over = dropAt?.stage === stage
              // Where the empty slot opens. Under a computed sort there is no slot
              // to promise — the column rearranges itself on drop — so that mode
              // keeps the plain column highlight it always had.
              const showSlot = over && !!dragId && reorderable
              const slotIndex = showSlot ? Math.min(dropAt.index, lane.length) : -1

              if (isCollapsed) {
                return (
                  <button
                    key={stage}
                    onClick={() => toggleColumn(stage)}
                    onDragOver={(e) => { e.preventDefault(); setDropAt({ stage, index: 0 }) }}
                    onDragLeave={() => setDropAt((c) => (c?.stage === stage ? null : c))}
                    onDrop={() => handleDrop(stage, columnLeads.filter((l) => l.id !== dragId))}
                    aria-label={`Expand ${config.label}`}
                    className={cn(
                      'flex h-full w-12 shrink-0 flex-col items-center gap-3 rounded-lg border py-3 transition-colors duration-150',
                      over ? cn(config.dropBorder, 'bg-surface-2/40') : 'border-border-default bg-surface-1/50 hover:border-border-strong',
                    )}
                  >
                    <span className={cn('flex size-7 items-center justify-center rounded-md border', config.accent)}>
                      <StageIcon size={13} />
                    </span>
                    {/* Vertical label so a parked column still reads. */}
                    <span
                      className="flex-1 font-ui text-[11px] font-bold uppercase tracking-wider text-text-3"
                      style={{ writingMode: 'vertical-rl' }}
                    >
                      {config.label}
                    </span>
                    <span className="font-mono text-[11px] font-bold tabular-nums text-text-2">{columnLeads.length}</span>
                  </button>
                )
              }

              return (
                <section
                  key={stage}
                  onDragOver={(e) => {
                    e.preventDefault()
                    // Entering over the header or the totals row aims at the foot
                    // of the column, but never overrides a slot the card list has
                    // already worked out — that fight is what made the slot flicker.
                    if (!dragId) return
                    setDropAt((c) => (c?.stage === stage ? c : { stage, index: lane.length }))
                  }}
                  onDragLeave={(e) => {
                    // Moving onto a card inside this column is not leaving it.
                    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return
                    setDropAt((c) => (c?.stage === stage ? null : c))
                  }}
                  onDrop={() => handleDrop(stage, lane)}
                  className={cn(
                    'flex h-full w-[84vw] shrink-0 flex-col gap-2.5 rounded-lg border p-2.5 transition-colors duration-150',
                    'sm:w-80',
                    over
                      ? cn(config.dropBorder, 'bg-surface-2/40')
                      : isTerminal ? 'border-border-subtle bg-surface-1/30' : 'border-border-default bg-surface-1/50',
                  )}
                >
                  <header className={cn('flex shrink-0 items-center gap-2 rounded-md border px-2.5 py-2', config.accent)}>
                    <StageIcon size={14} className="shrink-0" />
                    <span className="min-w-0 flex-1 truncate font-ui text-[11.5px] font-bold uppercase tracking-wider">
                      {config.label}
                    </span>
                    <span className="shrink-0 font-mono text-[11px] font-bold tabular-nums">{columnLeads.length}</span>
                    <button
                      onClick={() => toggleColumn(stage)}
                      aria-label={`Collapse ${config.label}`}
                      className="-mr-1 flex size-5 shrink-0 items-center justify-center rounded-xs opacity-60 transition-opacity hover:opacity-100"
                    >
                      <ChevronLeft size={13} />
                    </button>
                  </header>

                  <div className="flex shrink-0 items-baseline justify-between px-1">
                    <span className="font-mono text-[11px] tabular-nums text-text-3">
                      {value > 0 ? formatCompactCurrency(value) : '—'}
                    </span>
                    {!isTerminal && columnLeads.length > 0 && (
                      <span className="font-mono text-[10px] text-text-4">
                        avg {formatCompactCurrency(Math.round(value / columnLeads.length))}
                      </span>
                    )}
                  </div>

                  <div
                    // One handler owns the slot for the whole column. Per-card
                    // handlers left the gaps between cards uncovered, and the
                    // event bubbling out of a gap moved the slot to the foot —
                    // which shifted the cards, put a new one under the cursor,
                    // and started the whole thing over.
                    onDragOver={(e) => {
                      if (!dragId || !reorderable) return
                      e.preventDefault()
                      const next = dropIndexAt(e.currentTarget, e.clientY, stage, dragId)
                      // dragover fires continuously, cursor moving or not. Keeping
                      // the same object when the answer has not changed stops the
                      // column re-rendering dozens of times a second.
                      setDropAt((c) => (sameDropAt(c, next) ? c : next))
                    }}
                    className="flex min-h-2 flex-1 flex-col gap-2 overflow-y-auto overscroll-y-contain"
                  >
                    {columnLeads.length === 0 && !showSlot ? (
                      <p className="rounded-md border border-dashed border-border-subtle py-7 text-center font-ui text-[11.5px] text-text-4">
                        Drag a lead here
                      </p>
                    ) : (
                      columnLeads.map((lead) => {
                        // Slot within the column as it will be once the card in
                        // hand has left it; -1 for that card itself.
                        const slot = lane.findIndex((l) => l.id === lead.id)
                        const inHand = lead.id === dragId
                        return (
                          <Fragment key={lead.id}>
                            {showSlot && slotIndex === slot && slot !== -1 && <DropSlot height={dragHeight} />}
                            {/* The card in hand stays mounted but out of the flow:
                                the column closes up behind it, and it is still
                                there to receive its own dragend. */}
                            <div data-lead-card={lead.id} className={cn(inHand && 'hidden')}>
                              <LeadCard
                                lead={lead}
                                ownerAvatar={avatarOf(lead.ownerId)}
                                dragging={inHand}
                                onDragStart={(e) => {
                                  const rect = e.currentTarget.getBoundingClientRect()
                                  e.dataTransfer.effectAllowed = 'move'
                                  // Firefox refuses to start a drag whose dataTransfer
                                  // carries nothing.
                                  e.dataTransfer.setData('text/plain', lead.id)
                                  // Snapshot the card explicitly: it is about to leave
                                  // the flow, and a browser that builds the ghost after
                                  // this handler returns would drag an empty rectangle.
                                  e.dataTransfer.setDragImage(
                                    e.currentTarget,
                                    e.clientX - rect.left,
                                    e.clientY - rect.top,
                                  )
                                  const id = lead.id
                                  const height = rect.height
                                  // Deferred a tick on purpose. Hiding the source
                                  // element inside dragstart — which is what setting
                                  // dragId does — cancels the drag the browser is
                                  // still setting up, and nothing moves at all. A
                                  // timer rather than rAF: frames can stall inside a
                                  // native drag loop, and this must not depend on the
                                  // page painting.
                                  setTimeout(() => {
                                    setDragHeight(height)
                                    setDragId(id)
                                  }, 0)
                                }}
                                onDragEnd={endDrag}
                                onClick={() => setOpenLeadId(lead.id)}
                              />
                            </div>
                          </Fragment>
                        )
                      })
                    )}
                    {/* The tail slot, for a drop below the last card. */}
                    {showSlot && slotIndex >= lane.length && <DropSlot height={dragHeight} />}
                  </div>
                </section>
              )
            })}
          </div>
        ) : (
          <LeadTable
            leads={filtered}
            onOpen={setOpenLeadId}
            onNew={() => { setEditing(null); setFormOpen(true) }}
            avatarOf={avatarOf}
          />
        )}
      </div>

      {/* ── Overlays ── */}
      <LeadDrawer
        lead={openLead}
        onClose={() => setOpenLeadId(null)}
        onEdit={(l) => { setOpenLeadId(null); setEditing(l); setFormOpen(true) }}
        onLogActivity={(l) => setActivityFor(l)}
      />

      {formOpen && (
        <LeadFormModal
          key={editing?.id ?? 'new'}
          open
          lead={editing}
          onClose={() => { setFormOpen(false); setEditing(null) }}
        />
      )}

      {/* Remounted per open so a previous file's parse never survives a reopen. */}
      {importOpen && <LeadImportModal open onClose={() => setImportOpen(false)} />}

      <LogActivityModal
        key={activityFor?.id ?? 'none'}
        open={!!activityFor}
        lead={activityFor}
        onClose={() => setActivityFor(null)}
      />

      <HandoffModal
        key={handoffFor?.id ?? 'no-handoff'}
        open={!!handoffFor}
        lead={handoffFor}
        onClose={() => setHandoffFor(null)}
      />
    </div>
  )
}

/* ── Funnel strip ───────────────────────────────────────────────────────────── */

interface FunnelStripProps {
  byStage: Record<LeadStage, Lead[]>
  stats: { openValue: number; openCount: number; winRate: number; avgDeal: number }
}

/**
 * The pipeline's shape plus its headline numbers, in one strip.
 *
 * This replaced a row of four large KPI cards. The same figures are here, set
 * inline at label size — the numbers are context for the board, not the subject
 * of the page, and four big tiles pushed the board itself below the fold.
 */
function FunnelStrip({ byStage, stats }: FunnelStripProps) {
  const open = OPEN_STAGES.map((s) => ({ stage: s, leads: byStage[s] }))
  const total = open.reduce((sum, s) => sum + s.leads.length, 0)
  if (total === 0) return null

  return (
    <div className="flex shrink-0 flex-col gap-2 rounded-lg border border-border-default bg-surface-1 px-4 py-3.5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <SlidersHorizontal size={13} className="shrink-0 text-text-4" />
        <span className="font-ui text-[11px] font-semibold uppercase tracking-widest text-text-3">
          Open pipeline
        </span>
        <span className="font-mono text-[12px] tabular-nums text-text-1">
          {formatCompactCurrency(stats.openValue)}
        </span>
        <span className="font-mono text-[11px] tabular-nums text-text-4">{stats.openCount} deals</span>
        <span className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] tabular-nums text-text-4">
          <span>Win rate <span className="text-text-2">{stats.winRate}%</span></span>
          <span>Avg deal <span className="text-text-2">{formatCompactCurrency(stats.avgDeal)}</span></span>
          <span>Cycle <span className="text-text-2">34d</span></span>
        </span>
      </div>
      <div className="flex h-2 gap-0.5 overflow-hidden rounded-full">
        {open.map(({ stage, leads }) => {
          if (leads.length === 0) return null
          const config = STAGE_CONFIG[stage]
          return (
            <span
              key={stage}
              title={`${config.label}: ${leads.length}`}
              className={cn('h-full first:rounded-l-full last:rounded-r-full', config.accent)}
              style={{ width: `${(leads.length / total) * 100}%` }}
            />
          )
        })}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {open.map(({ stage, leads }) => (
          <span key={stage} className="flex items-center gap-1.5 font-ui text-[11px] text-text-4">
            <span className={cn('size-2 rounded-full border', STAGE_CONFIG[stage].accent)} />
            {STAGE_CONFIG[stage].label}
            <span className="font-mono tabular-nums text-text-2">{leads.length}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

/* ── Board card ─────────────────────────────────────────────────────────────── */

/**
 * The hole the dragged card will drop into.
 *
 * Sized to the card in hand so the column does not resize under the cursor as
 * the slot moves between rows of different heights.
 */
function DropSlot({ height }: { height: number }) {
  return (
    <div
      aria-hidden
      className="shrink-0 rounded-md border border-dashed border-brand-red/40 bg-brand-red/5"
      style={{ height: height || 96 }}
    />
  )
}

interface LeadCardProps {
  lead: Lead
  /** Resolved by the page from the BD roster — a lead record has no photo of its own. */
  ownerAvatar?: string
  dragging: boolean
  /** Receives the event so the board can measure the card it is about to lift. */
  onDragStart: (e: React.DragEvent<HTMLElement>) => void
  onDragEnd: () => void
  onClick: () => void
}

function LeadCard({ lead, ownerAvatar, dragging, onDragStart, onDragEnd, onClick }: LeadCardProps) {
  const tone = followUpTone(lead.nextFollowUp)
  const stalled = lead.lastContacted ? daysSince(lead.lastContacted) : null
  const isTerminal = lead.stage === 'won' || lead.stage === 'lost' || lead.stage === 'unqualified'

  return (
    <article
      draggable
      data-no-pan
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={cn(
        'group cursor-grab rounded-md border bg-surface-1 p-3 active:cursor-grabbing',
        'transition-[transform,opacity,border-color] duration-150 hover:border-border-strong',
        dragging ? 'scale-[0.98] opacity-40' : 'opacity-100',
        lead.stage === 'lost' || lead.stage === 'unqualified' ? 'border-border-subtle opacity-70' : 'border-border-default',
      )}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-ui text-body-sm/snug font-semibold text-text-1">{lead.company}</h3>
          <p className="truncate font-ui text-[11.5px] text-text-3">{lead.contactName}</p>
        </div>
        <TemperatureChip temperature={lead.temperature} />
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {lead.services.slice(0, 2).map((service) => (
          <span
            key={service}
            className="rounded-xs border border-border-subtle bg-surface-2 px-1.5 py-0.5 font-ui text-[10px] text-text-3"
          >
            {service}
          </span>
        ))}
        {lead.services.length > 2 && (
          <span className="rounded-xs border border-border-subtle bg-surface-2 px-1.5 py-0.5 font-ui text-[10px] text-text-4">
            +{lead.services.length - 2}
          </span>
        )}
      </div>

      <div className="mt-2.5 flex items-center gap-2 border-t border-border-subtle pt-2.5">
        <span className="font-mono text-[13px] font-semibold tabular-nums text-text-1">
          {formatCompactCurrency(lead.valueEntered, lead.valueCurrency)}
        </span>
        <span className="ml-auto flex items-center gap-1 font-mono text-[10px] text-text-4">
          <MessageSquare size={9} /> {lead.activityCount}
        </span>
        <ChannelChip channel={lead.channel} compact />
        <Avatar name={lead.ownerName} src={ownerAvatar} size="xs" />
      </div>

      {/* Only one time signal per card: the next action if there is one, else how
          long it has been quiet. Two dates on a card is noise. */}
      {!isTerminal && (
        lead.nextFollowUp && tone ? (
          <p className={cn('mt-2 flex items-center gap-1.5 font-mono text-[10.5px]', FOLLOW_UP_CLASSES[tone])}>
            {tone === 'overdue' ? <AlertTriangle size={11} /> : <CalendarClock size={11} />}
            {tone === 'overdue' ? 'Overdue · ' : tone === 'today' ? 'Today · ' : ''}
            {formatDate(lead.nextFollowUp)}
          </p>
        ) : (
          <p className={cn('mt-2 font-mono text-[10.5px]', stalled === null || stalled > 10 ? 'text-warning' : 'text-text-4')}>
            {stalled === null ? 'Not contacted' : `Quiet ${stalled} day${stalled === 1 ? '' : 's'}`}
          </p>
        )
      )}

      {lead.lostReason && <p className="mt-2 font-ui text-[10.5px] text-text-4">Lost — {lead.lostReason}</p>}
    </article>
  )
}

/* ── Table view ─────────────────────────────────────────────────────────────── */

const TABLE_COLS =
  'grid grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_120px_110px_110px_minmax(0,1fr)_110px] items-center gap-3'

interface LeadTableProps {
  leads: Lead[]
  onOpen: (id: string) => void
  onNew: () => void
  /** Photo lookup from the BD roster — a lead row carries an owner id, not a picture. */
  avatarOf: (personId: string | null | undefined) => string | undefined
}

function LeadTable({ leads, onOpen, onNew, avatarOf }: LeadTableProps) {
  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-surface-2 text-text-3">
          <Target size={22} />
        </span>
        <p className="font-ui text-[14px] text-text-2">No leads match those filters</p>
        <Button size="sm" variant="secondary" iconLeft={<Plus size={15} />} onClick={onNew}>Add a lead</Button>
      </div>
    )
  }

  return (
    <ResponsiveTable
      desktop={
        <div className="overflow-hidden rounded-lg border border-border-default bg-surface-1">
          <div
            className={cn(
              TABLE_COLS,
              'border-b border-border-subtle bg-surface-2 px-4 py-2.5 font-ui text-[11px] font-semibold uppercase tracking-widest text-text-3',
            )}
          >
            <span>Company</span>
            <span>Contact</span>
            <span>Stage</span>
            <span className="text-right">Value</span>
            <span>Channel</span>
            <span>Owner</span>
            <span>Follow-up</span>
          </div>
          {leads.map((lead) => {
            const tone = followUpTone(lead.nextFollowUp)
            return (
              <button
                key={lead.id}
                onClick={() => onOpen(lead.id)}
                className={cn(TABLE_COLS, 'w-full border-b border-border-subtle px-4 py-3 text-left transition-colors last:border-0 hover:bg-surface-2/50')}
              >
                <span className="min-w-0">
                  <span className="block truncate font-ui text-[13px] font-semibold text-text-1">{lead.company}</span>
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="truncate font-ui text-[11.5px] text-text-4">{lead.industry}</span>
                    <IcpFitChip fit={lead.icpFit} className="shrink-0" />
                  </span>
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-ui text-[12.5px] text-text-2">{lead.contactName}</span>
                  <span className="block truncate font-ui text-[11.5px] text-text-4">{lead.contactTitle}</span>
                </span>
                <StageChip stage={lead.stage} />
                <span className="text-right font-mono text-[12.5px] tabular-nums text-text-1">
                  {formatCompactCurrency(lead.valueEntered, lead.valueCurrency)}
                </span>
                <ChannelChip channel={lead.channel} />
                <span className="flex min-w-0 items-center gap-2">
                  <Avatar name={lead.ownerName} src={avatarOf(lead.ownerId)} size="xs" />
                  <span className="truncate font-ui text-[12.5px] text-text-2">{lead.ownerName}</span>
                </span>
                <span className={cn('font-mono text-[11.5px]', tone ? FOLLOW_UP_CLASSES[tone] : 'text-text-4')}>
                  {lead.nextFollowUp ? formatDate(lead.nextFollowUp) : '—'}
                </span>
              </button>
            )
          })}
        </div>
      }
      mobile={leads.map((lead) => (
        <button key={lead.id} onClick={() => onOpen(lead.id)} className="text-left">
          <LeadCard lead={lead} dragging={false} onDragStart={() => {}} onDragEnd={() => {}} onClick={() => onOpen(lead.id)} />
        </button>
      ))}
    />
  )
}
