import { useMemo, useState } from 'react'
import { Plus, ClipboardList, CheckCircle2, Clock, Send, Phone, CalendarCheck, UserPlus } from 'lucide-react'
import { Topbar } from '../../components/layout/Topbar'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Select'
import { Avatar } from '../../components/ui/Avatar'
import { BdKpiTile } from '../../components/shared/BdKpiTile'
import { ChannelChip } from '../../components/shared/BdChips'
import { cn } from '../../lib/cn'
import { formatRelativeTime } from '../../lib/utils'
import { useBd } from '../../context/BdPrototypeContext'
import { BD_REPS } from '../../data/bdMock'
import { DailyUpdateModal } from './DailyUpdateModal'
import type { BdDailyUpdate } from '../../types'

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
  const { updates, viewerRepId } = useBd()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<BdDailyUpdate | null>(null)
  const [dayOffset, setDayOffset] = useState('0')

  const { submitted, missing } = useMemo(() => {
    const date = isoDay(Number(dayOffset))
    const forDay = updates.filter((u) => u.date === date)
    return {
      submitted: forDay
        .filter((u) => u.submittedAt)
        .sort((a, b) => (b.submittedAt ?? '').localeCompare(a.submittedAt ?? '')),
      // Everyone expected to check in who has not — the BD Manager's actual question.
      missing: BD_REPS.filter((rep) => !forDay.some((u) => u.repId === rep.id && u.submittedAt)),
    }
  }, [dayOffset, updates])

  const totals = useMemo(
    () => ({
      proposals: submitted.reduce((s, u) => s + u.proposalsSent, 0),
      calls: submitted.reduce((s, u) => s + u.callsMade, 0),
      meetings: submitted.reduce((s, u) => s + u.meetingsHeld, 0),
      leads: submitted.reduce((s, u) => s + u.leadsAdded, 0),
    }),
    [submitted],
  )

  const compliance = Math.round((submitted.length / BD_REPS.length) * 100)

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Daily Updates" />
      <div className="p-4 lg:px-8 lg:py-7 flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <h2 className="font-display font-bold text-[22px] text-text-1">Daily Updates</h2>
            <p className="font-ui text-[13px] text-text-3">
              Who worked on what, on which platform — the whole department in under a minute
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Select value={dayOffset} onChange={setDayOffset} options={DAY_OPTIONS} size="sm" className="w-36" />
            <Button size="sm" iconLeft={<Plus size={15} />} onClick={() => { setEditing(null); setFormOpen(true) }}>Submit update</Button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <BdKpiTile
            icon={ClipboardList}
            label="Checked in"
            value={`${submitted.length}/${BD_REPS.length}`}
            tone={compliance === 100 ? 'success' : compliance >= 50 ? 'default' : 'warning'}
            delta={{ label: `${compliance}%`, direction: 'flat', caption: 'compliance' }}
          />
          <BdKpiTile icon={Send} label="Proposals sent" value={`${totals.proposals}`} />
          <BdKpiTile icon={Phone} label="Calls made" value={`${totals.calls}`} />
          <BdKpiTile icon={UserPlus} label="Leads added" value={`${totals.leads}`} />
        </div>

        {/* ── Still waiting on ── */}
        {missing.length > 0 && (
          <div className="rounded-lg border border-warning/30 bg-warning/5 px-4 py-3 flex flex-wrap items-center gap-x-3 gap-y-2">
            <Clock size={15} className="text-warning shrink-0" />
            <p className="font-ui text-[13px] text-text-2">
              Still waiting on{' '}
              <span className="font-semibold text-text-1">
                {missing.map((r) => r.name).join(', ')}
              </span>
            </p>
            <Button size="sm" variant="ghost" className="ml-auto">Send reminder</Button>
          </div>
        )}

        {/* ── Team feed ── */}
        <div className="flex flex-col gap-3">
          <h3 className="font-ui text-[11px] font-semibold uppercase tracking-widest text-text-4 px-0.5">
            Team feed
          </h3>

          {submitted.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <span className="size-12 rounded-full bg-surface-2 flex items-center justify-center text-text-3">
                <ClipboardList size={22} />
              </span>
              <p className="font-ui text-[14px] text-text-2">Nobody has checked in yet</p>
            </div>
          ) : (
            submitted.map((update) => (
              <UpdateCard
                key={update.id}
                update={update}
                onEdit={update.repId === viewerRepId ? () => { setEditing(update); setFormOpen(true) } : undefined}
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

function UpdateCard({ update, onEdit }: { update: BdDailyUpdate; onEdit?: () => void }) {
  const numbers = [
    { icon: Send, label: 'proposals', value: update.proposalsSent },
    { icon: Phone, label: 'calls', value: update.callsMade },
    { icon: CalendarCheck, label: 'meetings', value: update.meetingsHeld },
    { icon: UserPlus, label: 'leads', value: update.leadsAdded },
  ].filter((n) => n.value > 0)

  return (
    <article className="rounded-lg border border-border-default bg-surface-1 p-4 lg:p-5 flex flex-col gap-3.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Avatar name={update.repName} size="sm" />
        <div className="min-w-0">
          <h4 className="font-ui font-semibold text-[14px] text-text-1 truncate">{update.repName}</h4>
          <p className="flex items-center gap-1.5 font-mono text-[10.5px] text-text-4">
            <CheckCircle2 size={11} className="text-success" />
            Submitted {update.submittedAt ? formatRelativeTime(update.submittedAt) : ''}
          </p>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2.5">
          {update.platforms.map((channel) => (
            <ChannelChip key={channel} channel={channel} />
          ))}
          {onEdit && (
            <button
              onClick={onEdit}
              className="rounded-sm px-2 py-1 font-ui text-[11.5px] text-text-4 transition-colors hover:bg-surface-2 hover:text-text-2"
            >
              Edit
            </button>
          )}
        </div>
      </div>

      <p className="font-ui text-body-sm/relaxed text-text-2">{update.summary}</p>

      {numbers.length > 0 && (
        <div className="flex flex-wrap gap-2 border-t border-border-subtle pt-3.5">
          {numbers.map(({ icon: Icon, label, value }) => (
            <span
              key={label}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-sm bg-surface-2 border border-border-subtle px-2.5 py-1',
                'font-ui text-[11.5px] text-text-2',
              )}
            >
              <Icon size={12} className="text-text-4" />
              <span className="font-mono font-semibold text-text-1 tabular-nums">{value}</span>
              {label}
            </span>
          ))}
        </div>
      )}
    </article>
  )
}
