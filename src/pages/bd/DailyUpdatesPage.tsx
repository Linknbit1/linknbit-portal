import { useMemo, useState } from 'react'
import { Plus, ClipboardList, CheckCircle2, Clock, Send, Phone, CalendarCheck, UserPlus } from 'lucide-react'
import { Topbar } from '../../components/layout/Topbar'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Select'
import { Avatar } from '../../components/ui/Avatar'
import { ChannelChip } from '../../components/shared/BdChips'
import { cn } from '../../lib/cn'
import { useBd } from '../../context/BdContext'
import { DailyUpdateModal } from './DailyUpdateModal'
import type { BdDailyUpdate, BdChannel } from '../../types'

const DAY_OPTIONS = [
  { value: '0', label: 'Today' },
  { value: '-1', label: 'Yesterday' },
]

function isoDay(offset: number): string {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return d.toISOString().slice(0, 10)
}

export default function DailyUpdatesPage() {
  const { updates, activities, meetings, viewerRepId, people } = useBd()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<BdDailyUpdate | null>(null)
  const [dayOffset, setDayOffset] = useState('0')

  /**
   * Each rep's day, assembled from what they already logged.
   *
   * The SRS calls Key Numbers "auto-calculated", and the portal has moved away
   * from written standups (v1.4 — the task timer replaced them). So nobody
   * retypes their day here: activities, meetings and tasks supply the numbers,
   * and the only thing a rep adds is an optional note.
   */
  const { submitted, missing } = useMemo(() => {
    const date = isoDay(Number(dayOffset))

    const derived = people.map((rep) => {
      const mine = activities.filter((a) => a.byId === rep.id && a.at.slice(0, 10) === date)
      const myMeetings = meetings.filter((m) => m.hostId === rep.id && m.scheduledAt.slice(0, 10) === date)
      const note = updates.find((u) => u.repId === rep.id && u.date === date)
      return {
        rep,
        activityCount: mine.length,
        platforms: [...new Set(mine.map((a) => a.channel))],
        proposalsSent: mine.filter((a) => a.type === 'proposal').length
          + mine.filter((a) => a.leadId === null).reduce((n, a) => n + a.volume, 0),
        callsMade: mine.filter((a) => a.type === 'call').length,
        meetingsHeld: myMeetings.length,
        leadsAdded: mine.reduce((n, a) => n + a.leadsCreated, 0),
        note: note?.summary ?? '',
        noteId: note?.id,
      }
    })

    return {
      // "Checked in" now means "did any work the system can see" — not "wrote something".
      submitted: derived.filter((d) => d.activityCount > 0 || d.meetingsHeld > 0),
      missing: derived.filter((d) => d.activityCount === 0 && d.meetingsHeld === 0).map((d) => d.rep),
    }
  }, [dayOffset, updates, activities, meetings, people])

  const totals = useMemo(
    () => ({
      proposals: submitted.reduce((s, u) => s + u.proposalsSent, 0),
      calls: submitted.reduce((s, u) => s + u.callsMade, 0),
      meetings: submitted.reduce((s, u) => s + u.meetingsHeld, 0),
      leads: submitted.reduce((s, u) => s + u.leadsAdded, 0),
    }),
    [submitted],
  )


  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Daily Updates" />
      <div className="p-4 lg:px-8 lg:py-7 flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <h2 className="font-display font-bold text-[22px] text-text-1">Daily Updates</h2>
            <p className="font-ui text-[13px] text-text-3">
              Built from logged activity — nobody retypes their day. Add a note only if the numbers need context.
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Select value={dayOffset} onChange={setDayOffset} options={DAY_OPTIONS} size="sm" className="w-36" />
            <Button size="sm" variant="secondary" iconLeft={<Plus size={15} />} onClick={() => { setEditing(null); setFormOpen(true) }}>Add a note</Button>
          </div>
        </div>

        {/* ── Still waiting on ── */}
        {missing.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-warning/30 bg-warning/5 px-4 py-3">
            <Clock size={15} className="shrink-0 text-warning" />
            <p className="font-ui text-[13px] text-text-2">
              No logged activity today from{' '}
              <span className="font-semibold text-text-1">{missing.map((r) => r.name).join(', ')}</span>
            </p>
            
          </div>
        )}

        {/* ── Team feed ── */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 px-0.5">
            <h3 className="font-ui text-[11px] font-semibold uppercase tracking-widest text-text-4">Team feed</h3>
            <span className="font-mono text-[11px] text-text-4">
              {submitted.length}/{people.length} checked in · {totals.proposals} proposals · {totals.calls} calls · {totals.leads} leads
            </span>
          </div>

          {submitted.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-surface-2 text-text-3">
                <ClipboardList size={22} />
              </span>
              <p className="font-ui text-[14px] text-text-2">No activity logged today</p>
            </div>
          ) : (
            submitted.map((row) => (
              <DerivedUpdateCard
                key={row.rep.id}
                row={row}
                onAddNote={row.rep.id === viewerRepId ? () => { setEditing(null); setFormOpen(true) } : undefined}
              />
            ))
          )}
        </div>
      </div>

      {formOpen && (
        <DailyUpdateModal
          key={editing?.id ?? 'new'}
          open
          update={editing}
          onClose={() => { setFormOpen(false); setEditing(null) }}
        />
      )}
    </div>
  )
}

interface DerivedRow {
  rep: { id: string; name: string }
  activityCount: number
  platforms: BdChannel[]
  proposalsSent: number
  callsMade: number
  meetingsHeld: number
  leadsAdded: number
  note: string
}

/**
 * A rep's day as the system already knows it, with an optional human note.
 *
 * Nothing here is typed twice: the channels come from logged activity, the
 * counts from activities and meetings. The note is the only free text, and it
 * is optional by design.
 */
function DerivedUpdateCard({ row, onAddNote }: { row: DerivedRow; onAddNote?: () => void }) {
  const numbers = [
    { icon: Send, label: 'proposals', value: row.proposalsSent },
    { icon: Phone, label: 'calls', value: row.callsMade },
    { icon: CalendarCheck, label: 'meetings', value: row.meetingsHeld },
    { icon: UserPlus, label: 'leads', value: row.leadsAdded },
  ].filter((n) => n.value > 0)

  return (
    <article className="flex flex-col gap-3.5 rounded-lg border border-border-default bg-surface-1 p-4 lg:p-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Avatar name={row.rep.name} size="sm" />
        <div className="min-w-0">
          <h4 className="truncate font-ui text-[14px] font-semibold text-text-1">{row.rep.name}</h4>
          <p className="flex items-center gap-1.5 font-mono text-[10.5px] text-text-4">
            <CheckCircle2 size={11} className="text-success" />
            {row.activityCount} logged {row.activityCount === 1 ? 'activity' : 'activities'}
          </p>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2.5">
          {row.platforms.map((channel) => (
            <ChannelChip key={channel} channel={channel} />
          ))}
        </div>
      </div>

      {row.note ? (
        <p className="font-ui text-body-sm/relaxed text-text-2">{row.note}</p>
      ) : (
        onAddNote && (
          <button
            onClick={onAddNote}
            className="self-start font-ui text-[12px] text-text-4 underline-offset-2 transition-colors hover:text-text-2 hover:underline"
          >
            Add a note about today
          </button>
        )
      )}

      {numbers.length > 0 && (
        <div className="flex flex-wrap gap-2 border-t border-border-subtle pt-3.5">
          {numbers.map(({ icon: Icon, label, value }) => (
            <span
              key={label}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-sm border border-border-subtle bg-surface-2 px-2.5 py-1',
                'font-ui text-[11.5px] text-text-2',
              )}
            >
              <Icon size={12} className="text-text-4" />
              <span className="font-mono font-semibold tabular-nums text-text-1">{value}</span>
              {label}
            </span>
          ))}
        </div>
      )}
    </article>
  )
}
