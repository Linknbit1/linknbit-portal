import { useMemo, useState } from 'react'
import {
  AlertCircle, CalendarCheck, CheckCircle2, ClipboardList, Clock, History,
  Minus, Pencil, Phone, Plus, Send, Settings2, UserPlus, Users,
} from 'lucide-react'
import { Topbar } from '../../components/layout/Topbar'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Select'
import { Avatar } from '../../components/ui/Avatar'
import { ChannelChip } from '../../components/shared/BdChips'
import { cn } from '../../lib/cn'
import { formatDate, localIsoDate } from '../../lib/utils'
import { useBd } from '../../context/BdContext'
import { useCanAccess } from '../../hooks/useRoleFlags'
import {
  useAmIBdUpdateParticipant, useBdUpdateHistory, useBdUpdateRoster,
} from '../../hooks/useBd'
import { DailyUpdateModal } from './DailyUpdateModal'
import { BdUpdateParticipantsPanel } from './BdUpdateParticipantsPanel'
import type { BdDailyUpdate, BdUpdateHistoryDay, BdUpdateSlot } from '../../types'

/** How far back the personal history reaches in one go. */
const HISTORY_DAYS = 30

const DAY_OPTIONS = [
  { value: '0', label: 'Today' },
  { value: '-1', label: 'Yesterday' },
  { value: '-2', label: '2 days ago' },
  { value: '-3', label: '3 days ago' },
  { value: '-7', label: 'A week ago' },
]

type Tab = 'today' | 'history' | 'who'

/**
 * Business-development daily check-ins.
 *
 * Three things this screen is careful about, each of them a bug it used to have:
 *
 *  • **Who is chased.** The roster comes from `bd_update_roster`, which lists
 *    people holding can_submit_bd_updates — not everyone who can *see* BD. An
 *    admin overseeing the department is no longer named as missing an update
 *    they were never expected to file.
 *  • **A day off is not a miss.** The roster carries each person's own
 *    working-day answer, so somebody on a custom or flexible week is not
 *    reported absent from a day they never worked.
 *  • **History exists.** Anyone required to file can read their own back, gaps
 *    included; a lead with can_view_bd_team_updates can read the team's.
 */
export default function DailyUpdatesPage() {
  const { viewerRepId, activities, meetings, avatarOf } = useBd()
  const canManage = useCanAccess('can_manage_bd')
  const canSeeTeam = useCanAccess('can_view_bd_team_updates')
  const { data: amRequired = false } = useAmIBdUpdateParticipant()

  const [tab, setTab] = useState<Tab>('today')
  const [dayOffset, setDayOffset] = useState('0')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<BdDailyUpdate | null>(null)

  const date = localIsoDate(Number(dayOffset))
  const { data: roster = [], isPending: rosterLoading } = useBdUpdateRoster(date)

  const mine = roster.find((slot) => slot.repId === viewerRepId)
  const openForm = (update: BdDailyUpdate | null) => { setEditing(update); setFormOpen(true) }

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Daily Updates" />
      <div className="p-4 lg:px-8 lg:py-7 flex flex-col gap-6">

        <div className="flex flex-wrap items-center gap-3">
          <nav className="flex items-center gap-1" aria-label="Daily update views">
            <TabButton active={tab === 'today'} onClick={() => setTab('today')} icon={CalendarCheck}>
              {canSeeTeam ? 'The day' : 'My check-in'}
            </TabButton>
            <TabButton active={tab === 'history'} onClick={() => setTab('history')} icon={History}>
              My history
            </TabButton>
            {canManage && (
              <TabButton active={tab === 'who'} onClick={() => setTab('who')} icon={Settings2}>
                Who files these
              </TabButton>
            )}
          </nav>

          {tab === 'today' && (
            <div className="ml-auto flex items-center gap-2">
              <Select value={dayOffset} onChange={setDayOffset} options={DAY_OPTIONS} size="sm" className="w-40" />
            </div>
          )}
        </div>

        {tab === 'today' && (
          <TodayView
            date={date}
            dayOffset={Number(dayOffset)}
            roster={roster}
            loading={rosterLoading}
            mine={mine}
            amRequired={amRequired}
            canSeeTeam={canSeeTeam}
            viewerRepId={viewerRepId}
            activities={activities}
            meetings={meetings}
            avatarOf={avatarOf}
            onWrite={openForm}
          />
        )}

        {tab === 'history' && (
          <HistoryView profileId={viewerRepId} onEdit={openForm} />
        )}

        {tab === 'who' && canManage && <BdUpdateParticipantsPanel />}
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

function TabButton({ active, onClick, icon: Icon, children }: {
  active: boolean
  onClick: () => void
  icon: typeof CalendarCheck
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex items-center gap-1.5 rounded-sm border px-3 py-1.5 font-ui text-[12.5px] transition-colors duration-150',
        active
          ? 'border-brand-red/40 bg-brand-red/13 text-text-1'
          : 'border-border-default bg-surface-1 text-text-3 hover:border-border-strong hover:text-text-2',
      )}
    >
      <Icon size={13} />
      {children}
    </button>
  )
}

/* ── The day ──────────────────────────────────────────────────────────────── */

interface TodayViewProps {
  date: string
  dayOffset: number
  roster: BdUpdateSlot[]
  loading: boolean
  mine: BdUpdateSlot | undefined
  amRequired: boolean
  canSeeTeam: boolean
  viewerRepId: string
  activities: ReturnType<typeof useBd>['activities']
  meetings: ReturnType<typeof useBd>['meetings']
  avatarOf: (id: string | null | undefined) => string | undefined
  onWrite: (update: BdDailyUpdate | null) => void
}

function TodayView({
  date, dayOffset, roster, loading, mine, amRequired, canSeeTeam,
  viewerRepId, activities, meetings, avatarOf, onWrite,
}: TodayViewProps) {
  // What the system already saw that person do, shown beside people who have
  // not written anything — so "no check-in" does not read as "did nothing".
  const loggedBy = useMemo(() => {
    const map = new Map<string, { activities: number; meetings: number }>()
    for (const a of activities) {
      if (a.at.slice(0, 10) !== date) continue
      const cur = map.get(a.byId) ?? { activities: 0, meetings: 0 }
      map.set(a.byId, { ...cur, activities: cur.activities + 1 })
    }
    for (const m of meetings) {
      if (m.scheduledAt.slice(0, 10) !== date) continue
      const cur = map.get(m.hostId) ?? { activities: 0, meetings: 0 }
      map.set(m.hostId, { ...cur, meetings: cur.meetings + 1 })
    }
    return map
  }, [activities, meetings, date])

  const expected = roster.filter((s) => s.isWorkingDay)
  const filed = expected.filter((s) => s.update?.submittedAt)
  const missing = expected.filter((s) => !s.update?.submittedAt)
  const offToday = roster.filter((s) => !s.isWorkingDay)

  const isToday = dayOffset === 0
  const myUpdate = mine?.update ?? null

  return (
    <>
      {/* ── Your own check-in, when one is owed ── */}
      {amRequired && isToday && (
        <div className={cn(
          'flex flex-wrap items-center gap-x-4 gap-y-3 rounded-lg border px-4 py-3.5',
          myUpdate?.submittedAt
            ? 'border-success/30 bg-success/5'
            : 'border-warning/30 bg-warning/5',
        )}>
          {myUpdate?.submittedAt ? (
            <>
              <CheckCircle2 size={16} className="shrink-0 text-success" />
              <p className="font-ui text-[13px] text-text-2">
                You have checked in for today. You can change it until midnight.
              </p>
              <Button size="sm" variant="secondary" iconLeft={<Pencil size={14} />}
                className="ml-auto" onClick={() => onWrite(myUpdate)}>
                Edit my update
              </Button>
            </>
          ) : (
            <>
              <AlertCircle size={16} className="shrink-0 text-warning" />
              <p className="font-ui text-[13px] text-text-2">
                You have not filed today&apos;s update yet.
              </p>
              <Button size="sm" iconLeft={<Plus size={14} />} className="ml-auto"
                onClick={() => onWrite(null)}>
                Write today&apos;s update
              </Button>
            </>
          )}
        </div>
      )}

      {/* ── Still waiting on ── */}
      {canSeeTeam && missing.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-border-default bg-surface-1 px-4 py-3">
          <Clock size={15} className="shrink-0 text-warning" />
          <p className="font-ui text-[13px] text-text-2">
            No update yet from{' '}
            <span className="font-semibold text-text-1">
              {missing.map((s) => s.repName).join(', ')}
            </span>
          </p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2 px-0.5">
          <h3 className="font-ui text-[11px] font-semibold uppercase tracking-widest text-text-4">
            {formatDate(date)}
          </h3>
          <span className="font-mono text-[11px] text-text-4">
            {filed.length}/{expected.length} filed
            {offToday.length > 0 && ` · ${offToday.length} not working`}
          </span>
        </div>

        {loading ? (
          <div className="flex flex-col gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-lg border border-border-default bg-surface-1" />
            ))}
          </div>
        ) : roster.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Nobody is set up to file daily updates"
            body="Grant the Business Development role, or use “Who files these” to require someone directly."
          />
        ) : (
          [...expected, ...offToday].map((slot) => (
            <SlotCard
              key={slot.repId}
              slot={slot}
              logged={loggedBy.get(slot.repId)}
              avatarUrl={avatarOf(slot.repId)}
              onWrite={slot.repId === viewerRepId && isToday
                ? () => onWrite(slot.update)
                : undefined}
            />
          ))
        )}
      </div>
    </>
  )
}

function SlotCard({ slot, logged, avatarUrl, onWrite }: {
  slot: BdUpdateSlot
  logged: { activities: number; meetings: number } | undefined
  avatarUrl: string | undefined
  onWrite?: () => void
}) {
  const update = slot.update?.submittedAt ? slot.update : null

  return (
    <article className={cn(
      'flex flex-col gap-3.5 rounded-lg border bg-surface-1 p-4 lg:p-5',
      slot.isWorkingDay ? 'border-border-default' : 'border-border-subtle opacity-70',
    )}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Avatar name={slot.repName} src={avatarUrl} size="sm" />
        <div className="min-w-0">
          <h4 className="truncate font-ui text-[14px] font-semibold text-text-1">{slot.repName}</h4>
          <p className="flex items-center gap-1.5 font-mono text-[10.5px] text-text-4">
            {!slot.isWorkingDay ? (
              <><Minus size={11} /> Not a working day for them</>
            ) : update ? (
              <><CheckCircle2 size={11} className="text-success" /> Checked in</>
            ) : (
              <><Clock size={11} className="text-warning" /> No update yet</>
            )}
          </p>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2.5">
          {update?.platforms.map((channel) => (
            <ChannelChip key={channel} channel={channel} />
          ))}
        </div>
      </div>

      {update ? (
        // `whitespace-pre-line`: notes are typed as multi-line bullet lists, and
        // HTML collapses those newlines into one run-on paragraph without it.
        <p className="whitespace-pre-line font-ui text-body-sm/relaxed text-text-2">{update.summary}</p>
      ) : slot.isWorkingDay && (
        <p className="font-ui text-[12.5px] text-text-3">
          {logged
            ? `Nothing written, but the system logged ${logged.activities} ${logged.activities === 1 ? 'activity' : 'activities'}${logged.meetings > 0 ? ` and ${logged.meetings} ${logged.meetings === 1 ? 'meeting' : 'meetings'}` : ''}.`
            : 'Nothing logged and nothing written.'}
        </p>
      )}

      {onWrite && !update && (
        <button
          onClick={onWrite}
          className="self-start font-ui text-[12px] text-text-4 underline-offset-2 transition-colors hover:text-text-2 hover:underline"
        >
          Write my update
        </button>
      )}

      {update && <KeyNumbers update={update} />}
    </article>
  )
}

function KeyNumbers({ update }: { update: BdDailyUpdate }) {
  const numbers = [
    { icon: Send, label: 'proposals', value: update.proposalsSent },
    { icon: Phone, label: 'calls', value: update.callsMade },
    { icon: CalendarCheck, label: 'meetings', value: update.meetingsHeld },
    { icon: UserPlus, label: 'leads', value: update.leadsAdded },
  ].filter((n) => n.value > 0)

  if (numbers.length === 0) return null

  return (
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
  )
}

/* ── History ──────────────────────────────────────────────────────────────── */

function HistoryView({ profileId, onEdit }: {
  profileId: string
  onEdit: (update: BdDailyUpdate | null) => void
}) {
  const to = localIsoDate(0)
  const from = localIsoDate(-(HISTORY_DAYS - 1))
  const { data: days = [], isPending } = useBdUpdateHistory(profileId, from, to)

  // A day only counts as missed if something was actually expected of you on it.
  const owed = days.filter((d) => d.isRequired && d.isWorkingDay)
  const filed = owed.filter((d) => d.update?.submittedAt)

  if (isPending) {
    return (
      <div className="flex flex-col gap-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg border border-border-default bg-surface-1" />
        ))}
      </div>
    )
  }

  if (days.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="No history yet"
        body="Daily updates you file will be listed here, newest first."
      />
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 px-0.5">
        <h3 className="font-ui text-[11px] font-semibold uppercase tracking-widest text-text-4">
          Last {HISTORY_DAYS} days
        </h3>
        <span className="font-mono text-[11px] text-text-4">
          {filed.length}/{owed.length} filed
        </span>
      </div>

      {days.map((day) => <HistoryRow key={day.date} day={day} onEdit={onEdit} />)}
    </div>
  )
}

function HistoryRow({ day, onEdit }: {
  day: BdUpdateHistoryDay
  onEdit: (update: BdDailyUpdate | null) => void
}) {
  const update = day.update?.submittedAt ? day.update : null
  const missed = !update && day.isRequired && day.isWorkingDay

  return (
    <article className={cn(
      'flex flex-col gap-3 rounded-lg border bg-surface-1 p-4',
      missed ? 'border-warning/25' : 'border-border-default',
      !day.isWorkingDay && 'opacity-70',
    )}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <h4 className="font-ui text-[13px] font-semibold text-text-1">{formatDate(day.date)}</h4>
        <span className="flex items-center gap-1.5 font-mono text-[10.5px] text-text-4">
          {!day.isWorkingDay ? (
            <><Minus size={11} /> Not a working day</>
          ) : update ? (
            <><CheckCircle2 size={11} className="text-success" /> Filed</>
          ) : day.isRequired ? (
            <><AlertCircle size={11} className="text-warning" /> Missed</>
          ) : (
            <><Minus size={11} /> Not required</>
          )}
        </span>

        <div className="ml-auto flex items-center gap-2.5">
          {update?.platforms.map((channel) => <ChannelChip key={channel} channel={channel} />)}
          {/* A manager may amend an old day, but only one that exists — the form
              writes today's date when handed nothing, so offering "Write" on a
              past blank row would silently file it against today. */}
          {day.canEdit && (update || day.date === localIsoDate(0)) && (
            <Button size="sm" variant="ghost" iconLeft={<Pencil size={13} />}
              onClick={() => onEdit(update)}>
              {update ? 'Edit' : 'Write'}
            </Button>
          )}
        </div>
      </div>

      {update && (
        <p className="whitespace-pre-line font-ui text-body-sm/relaxed text-text-2">{update.summary}</p>
      )}
      {update && <KeyNumbers update={update} />}
    </article>
  )
}

export function EmptyState({ icon: Icon, title, body }: {
  icon: typeof ClipboardList
  title: string
  body: string
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-surface-2 text-text-3">
        <Icon size={22} />
      </span>
      <p className="font-ui text-[14px] text-text-2">{title}</p>
      <p className="max-w-md font-ui text-[12.5px] text-text-4">{body}</p>
    </div>
  )
}
