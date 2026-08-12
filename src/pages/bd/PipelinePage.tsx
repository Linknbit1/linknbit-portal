import { useMemo, useState } from 'react'
import {
  Plus, Search, Target, Columns3, Table2, CalendarClock,
  AlertTriangle, MessageSquare, ChevronLeft, SlidersHorizontal,
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
import { useBd } from '../../context/BdPrototypeContext'
import { useDragScroll } from '../../hooks/useDragScroll'
import { cn } from '../../lib/cn'
import { formatCompactCurrency, formatDate, getDaysUntil } from '../../lib/utils'
import { BD_REPS } from '../../data/bdMock'
import { LeadDrawer } from './LeadDrawer'
import { LeadFormModal } from './LeadFormModal'
import { LogActivityModal } from './LogActivityModal'
import type { Lead, LeadStage } from '../../types'

type PipelineView = 'board' | 'table'

const PIPELINE_VIEWS: ViewToggleOption<PipelineView>[] = [
  { value: 'board', label: 'Board', icon: Columns3 },
  { value: 'table', label: 'Table', icon: Table2 },
]

const SORTS = [
  { value: 'value', label: 'Highest value' },
  { value: 'followup', label: 'Follow-up date' },
  { value: 'recent', label: 'Recently contacted' },
  { value: 'company', label: 'Company A–Z' },
]

const OPEN_STAGES: LeadStage[] = ['new', 'contacted', 'qualified', 'proposal_sent', 'negotiation']

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
  const { leads, moveLeadStage } = useBd()

  const [search, setSearch] = useState('')
  const [owner, setOwner] = useState('all')
  const [sort, setSort] = useState('value')
  const [view, setView] = useState<PipelineView>('board')
  const [collapsed, setCollapsed] = useState<LeadStage[]>([])

  const [openLeadId, setOpenLeadId] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Lead | null>(null)
  const [activityFor, setActivityFor] = useState<Lead | null>(null)

  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<LeadStage | null>(null)
  const boardRef = useDragScroll<HTMLDivElement>()

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
    const sorted = [...rows]
    if (sort === 'value') sorted.sort((a, b) => b.value - a.value)
    if (sort === 'company') sorted.sort((a, b) => a.company.localeCompare(b.company))
    if (sort === 'recent') sorted.sort((a, b) => b.lastContacted.localeCompare(a.lastContacted))
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

  const handleDrop = (stage: LeadStage) => {
    setDragOver(null)
    const id = dragId
    setDragId(null)
    if (!id) return
    const lead = leads.find((l) => l.id === id)
    if (!lead || lead.stage === stage) return
    moveLeadStage(id, stage, stage === 'lost' ? 'No response' : undefined)
    toast(`${lead.company} → ${STAGE_CONFIG[stage].label}`, stage === 'won' ? 'success' : 'info')
  }

  const toggleColumn = (stage: LeadStage) =>
    setCollapsed((c) => (c.includes(stage) ? c.filter((s) => s !== stage) : [...c, stage]))

  return (
    <div className="flex flex-1 flex-col">
      <Topbar title="Pipeline" />
      <div className="flex flex-col gap-6 p-4 lg:px-8 lg:py-7">
        {/* ── Header ── */}
        <div className="flex flex-wrap items-center gap-3">
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
              options={[{ value: 'all', label: 'All reps' }, ...BD_REPS.map((r) => ({ value: r.id, label: r.name }))]}
            />
            <Select value={sort} onChange={setSort} options={SORTS} size="sm" className="w-44" />
            <ViewToggle value={view} onChange={setView} options={PIPELINE_VIEWS} className="hidden lg:flex" />
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
            className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-3 no-scrollbar lg:mx-0 lg:px-0"
          >
            {STAGE_ORDER.map((stage) => {
              const config = STAGE_CONFIG[stage]
              const columnLeads = byStage[stage]
              const value = columnLeads.reduce((sum, l) => sum + l.value, 0)
              const StageIcon = config.icon
              const isCollapsed = collapsed.includes(stage)
              const isTerminal = stage === 'won' || stage === 'lost'

              if (isCollapsed) {
                return (
                  <button
                    key={stage}
                    onClick={() => toggleColumn(stage)}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(stage) }}
                    onDragLeave={() => setDragOver((c) => (c === stage ? null : c))}
                    onDrop={() => handleDrop(stage)}
                    aria-label={`Expand ${config.label}`}
                    className={cn(
                      'flex w-12 shrink-0 flex-col items-center gap-3 rounded-lg border py-3 transition-colors duration-150',
                      dragOver === stage ? cn(config.dropBorder, 'bg-surface-2/40') : 'border-border-default bg-surface-1/50 hover:border-border-strong',
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
                  onDragOver={(e) => { e.preventDefault(); setDragOver(stage) }}
                  onDragLeave={() => setDragOver((c) => (c === stage ? null : c))}
                  onDrop={() => handleDrop(stage)}
                  className={cn(
                    'flex w-[84vw] shrink-0 flex-col gap-2.5 rounded-lg border p-2.5 transition-colors duration-150',
                    'sm:w-[300px] lg:w-[292px]',
                    dragOver === stage
                      ? cn(config.dropBorder, 'bg-surface-2/40')
                      : isTerminal ? 'border-border-subtle bg-surface-1/30' : 'border-border-default bg-surface-1/50',
                  )}
                >
                  <header className={cn('flex items-center gap-2 rounded-md border px-2.5 py-2', config.accent)}>
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

                  <div className="flex items-baseline justify-between px-1">
                    <span className="font-mono text-[11px] tabular-nums text-text-3">
                      {value > 0 ? formatCompactCurrency(value) : '—'}
                    </span>
                    {!isTerminal && columnLeads.length > 0 && (
                      <span className="font-mono text-[10px] text-text-4">
                        avg {formatCompactCurrency(Math.round(value / columnLeads.length))}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    {columnLeads.length === 0 ? (
                      <p className="rounded-md border border-dashed border-border-subtle py-7 text-center font-ui text-[11.5px] text-text-4">
                        Drag a lead here
                      </p>
                    ) : (
                      columnLeads.map((lead) => (
                        <LeadCard
                          key={lead.id}
                          lead={lead}
                          dragging={dragId === lead.id}
                          onDragStart={() => setDragId(lead.id)}
                          onDragEnd={() => { setDragId(null); setDragOver(null) }}
                          onClick={() => setOpenLeadId(lead.id)}
                        />
                      ))
                    )}
                  </div>
                </section>
              )
            })}
          </div>
        ) : (
          <LeadTable leads={filtered} onOpen={setOpenLeadId} onNew={() => { setEditing(null); setFormOpen(true) }} />
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

      <LogActivityModal
        key={activityFor?.id ?? 'none'}
        open={!!activityFor}
        lead={activityFor}
        onClose={() => setActivityFor(null)}
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
    <div className="flex flex-col gap-2 rounded-lg border border-border-default bg-surface-1 px-4 py-3.5">
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

interface LeadCardProps {
  lead: Lead
  dragging: boolean
  onDragStart: () => void
  onDragEnd: () => void
  onClick: () => void
}

function LeadCard({ lead, dragging, onDragStart, onDragEnd, onClick }: LeadCardProps) {
  const tone = followUpTone(lead.nextFollowUp)
  const stalled = daysSince(lead.lastContacted)
  const isTerminal = lead.stage === 'won' || lead.stage === 'lost'

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
        lead.stage === 'lost' ? 'border-border-subtle opacity-70' : 'border-border-default',
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
          {formatCompactCurrency(lead.value)}
        </span>
        <span className="ml-auto flex items-center gap-1 font-mono text-[10px] text-text-4">
          <MessageSquare size={9} /> {lead.activityCount}
        </span>
        <ChannelChip channel={lead.channel} compact />
        <Avatar name={lead.ownerName} size="xs" />
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
          <p className={cn('mt-2 font-mono text-[10.5px]', stalled > 10 ? 'text-warning' : 'text-text-4')}>
            Quiet {stalled} day{stalled === 1 ? '' : 's'}
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

function LeadTable({ leads, onOpen, onNew }: { leads: Lead[]; onOpen: (id: string) => void; onNew: () => void }) {
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
                  {formatCompactCurrency(lead.value)}
                </span>
                <ChannelChip channel={lead.channel} />
                <span className="flex min-w-0 items-center gap-2">
                  <Avatar name={lead.ownerName} size="xs" />
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
