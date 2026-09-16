import { useMemo, useState } from 'react'
import {
  AlertCircle, CalendarCheck, CheckCircle2, ClipboardList, Clock, History,
  Minus, Pencil, Phone, Plus, Send, UserPlus, Users,
} from 'lucide-react'
import { Topbar } from '../../components/layout/Topbar'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Select'
import { Avatar } from '../../components/ui/Avatar'
import { ChannelChip } from '../../components/shared/BdChips'
import { MonthStepper } from '../../components/shared/MonthFilter'
import { cn } from '../../lib/cn'
import { formatDate, formatRelativeTime, localIsoDate } from '../../lib/utils'
import { useBd } from '../../context/BdContext'
import { useCanAccess } from '../../hooks/useRoleFlags'
import { useMonthFilter } from '../../hooks/useMonthFilter'
import {
  useAmIBdUpdateParticipant, useBdUpdateHistory, useBdUpdateRoster,
} from '../../hooks/useBd'
import { DailyUpdateModal } from './DailyUpdateModal'
import type { BdDailyUpdate, BdUpdateSlot } from '../../types'

const DAY_OPTIONS = [
  { value: '0', label: 'Today' },
  { value: '-1', label: 'Yesterday' },
  { value: '-2', label: '2 days ago' },
  { value: '-3', label: '3 days ago' },
  { value: '-7', label: 'A week ago' },
]

type Tab = 'today' | 'history'

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
 *    working-day answer, so somebody on a custom or flexible week is neither
 *    reported absent from a day they never worked nor prompted to file on one.
 *  • **History exists.** Anyone who files can read their own updates back a
 *    month at a time. Only days they actually wrote something appear.
 */
export default function DailyUpdatesPage() {
  const { viewerRepId, activities, meetings, avatarOf } = useBd()
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

  /**
   * Nothing is owed from you on a day you do not work.
   *
   * `amRequired` answers "do you file these at all", which is a question about
   * the person and not about the date — on its own it chased a business
   * developer for a Sunday update. The roster carries that person's own
   * working-day answer, so the prompt waits for it rather than assuming: while
   * the roster loads `mine` is undefined, and showing the banner then only to
   * withdraw it is worse than showing it a moment late.
   */
  const owedToday = amRequired && isToday && mine?.isWorkingDay === true
  const notWorkingToday = amRequired && isToday && !loading && mine?.isWorkingDay === false

  return (
    <>
      {/* ── Nothing owed: say so, rather than leaving the day looking unfinished ── */}
      {notWorkingToday && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-border-default bg-surface-1 px-4 py-3">
          <Minus size={15} className="shrink-0 text-text-4" />
          <p className="font-ui text-[13px] text-text-2">
            Today is not one of your working days, so no update is expected from you.
          </p>
        </div>
      )}

      {/* ── Your own check-in, when one is owed ── */}
      {owedToday && (
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
              onWrite={slot.repId === viewerRepId && isToday && slot.isWorkingDay
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

/* ── History ──────────────────────────────────────────────────────── */

/**
 * The updates this person actually wrote, a month at a time.
 *
 * Only filed days appear. A calendar with a row for every day was showing
 * thirty "nothing here" rows to read four real ones, and a day nobody wrote
 * anything about has nothing to say.
 */
function HistoryView({ profileId, onEdit }: {
  profileId: string
  onEdit: (update: BdDailyUpdate) => void
}) {
  const monthFilter = useMonthFilter()
  const range = monthFilter.allMonths ? null : monthRange(monthFilter.year, monthFilter.month)
  const { data: updates = [], isPending } = useBdUpdateHistory(profileId, range)

  const today = localIsoDate(0)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-ui text-[11px] font-semibold uppercase tracking-widest text-text-4">
          My updates
        </h3>
        {!isPending && updates.length > 0 && (
          <span className="font-mono text-[11px] text-text-4">
            {updates.length} {updates.length === 1 ? 'day' : 'days'}
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          <MonthStepper filter={monthFilter} hideCurrent />
        </div>
      </div>

      {isPending ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg border border-border-default bg-surface-1" />
          ))}
        </div>
      ) : updates.length === 0 ? (
        <EmptyState
          icon={History}
          title={monthFilter.allMonths ? 'No updates yet' : `Nothing filed in ${monthFilter.label}`}
          body="Daily updates you file are listed here, newest first."
        />
      ) : (
        updates.map((update) => (
          <HistoryRow
            key={update.id}
            update={update}
            // Today's is the only one that can still be changed. Everything
            // before it is settled, and the database refuses the write anyway.
            editable={update.date === today}
            onEdit={onEdit}
          />
        ))
      )}
    </div>
  )
}

/** Inclusive first and last day of a month, as 'YYYY-MM-DD'. */
function monthRange(year: number, month: number): { from: string; to: string } {
  const mm = String(month).padStart(2, '0')
  // Day 0 of the next month is the last day of this one, leap years included.
  const last = new Date(year, month, 0).getDate()
  return { from: `${year}-${mm}-01`, to: `${year}-${mm}-${String(last).padStart(2, '0')}` }
}

function HistoryRow({ update, editable, onEdit }: {
  update: BdDailyUpdate
  editable: boolean
  onEdit: (update: BdDailyUpdate) => void
}) {
  return (
    <article className="flex flex-col gap-3 rounded-lg border border-border-default bg-surface-1 p-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <h4 className="font-ui text-[13px] font-semibold text-text-1">{formatDate(update.date)}</h4>
        <span className="flex items-center gap-1.5 font-mono text-[10.5px] text-text-4">
          <CheckCircle2 size={11} className="text-success" />
          {update.submittedAt ? formatRelativeTime(update.submittedAt) : 'Filed'}
        </span>

        <div className="ml-auto flex items-center gap-2.5">
          {update.platforms.map((channel) => <ChannelChip key={channel} channel={channel} />)}
          {editable && (
            <Button size="sm" variant="ghost" iconLeft={<Pencil size={13} />}
              onClick={() => onEdit(update)}>
              Edit
            </Button>
          )}
        </div>
      </div>

      <p className="whitespace-pre-line font-ui text-body-sm/relaxed text-text-2">{update.summary}</p>
      <KeyNumbers update={update} />
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
