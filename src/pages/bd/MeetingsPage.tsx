import { useMemo, useState } from 'react'
import {
  Plus, CalendarClock, Video, Phone, MapPin, ArrowRight,
} from 'lucide-react'
import { Topbar } from '../../components/layout/Topbar'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Select'
import { Avatar } from '../../components/ui/Avatar'
import { Tabs } from '../../components/ui/Tabs'
import { cn } from '../../lib/cn'
import { useBd } from '../../context/BdPrototypeContext'
import { BD_REPS } from '../../data/bdMock'
import { MeetingFormModal } from './MeetingFormModal'
import type { BdMeeting, MeetingType, MeetingPlatform } from '../../types'

const TYPE_CONFIG: Record<MeetingType, { label: string; classes: string }> = {
  discovery:   { label: 'Discovery',   classes: 'bg-[rgba(96,165,250,0.12)] text-[#60A5FA] border-[rgba(96,165,250,0.3)]' },
  proposal:    { label: 'Proposal',    classes: 'bg-[rgba(167,139,250,0.12)] text-[#A78BFA] border-[rgba(167,139,250,0.3)]' },
  negotiation: { label: 'Negotiation', classes: 'bg-[rgba(245,158,11,0.12)] text-[#F59E0B] border-[rgba(245,158,11,0.3)]' },
  kickoff:     { label: 'Kickoff',     classes: 'bg-[rgba(34,197,94,0.12)] text-[#22C55E] border-[rgba(34,197,94,0.3)]' },
  other:       { label: 'Other',       classes: 'bg-surface-3 text-text-3 border-border-default' },
}

const PLATFORM_CONFIG: Record<MeetingPlatform, { label: string; icon: typeof Video }> = {
  zoom:      { label: 'Zoom',        icon: Video },
  meet:      { label: 'Google Meet', icon: Video },
  phone:     { label: 'Phone',       icon: Phone },
  in_person: { label: 'In person',   icon: MapPin },
}

const HOST_OPTIONS = [
  { value: 'all', label: 'All hosts' },
  ...BD_REPS.map((r) => ({ value: r.id, label: r.name })),
]

const TABS = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'past', label: 'Past' },
]

function timeOf(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

/** "Today" / "Tomorrow" / "Mon 18 Aug" — meetings are read by day, not by date. */
function dayLabel(iso: string): string {
  const date = new Date(iso)
  const today = new Date()
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const diff = Math.round((startOfDay(date) - startOfDay(today)) / 86_400_000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff === -1) return 'Yesterday'
  return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

export default function MeetingsPage() {
  const { meetings } = useBd()
  const [editing, setEditing] = useState<BdMeeting | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [tab, setTab] = useState('upcoming')
  const [host, setHost] = useState('all')
  // One reference "now", captured once per mount. Reading the clock during render
  // makes the component impure, and the schedule would reshuffle on any unrelated
  // re-render — a meeting could jump from Upcoming to Past mid-interaction.
  const [now] = useState(() => Date.now())

  const { upcoming, past } = useMemo(() => {
    const scoped = meetings.filter((m) => host === 'all' || m.hostId === host)
    return {
      upcoming: scoped
        .filter((m) => new Date(m.scheduledAt).getTime() >= now)
        .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)),
      past: scoped
        .filter((m) => new Date(m.scheduledAt).getTime() < now)
        .sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt)),
    }
  }, [host, now, meetings])

  const shown = tab === 'upcoming' ? upcoming : past

  // Group by day so the list reads as a schedule rather than a flat feed.
  const grouped = useMemo(() => {
    const groups: { label: string; meetings: BdMeeting[] }[] = []
    for (const meeting of shown) {
      const label = dayLabel(meeting.scheduledAt)
      const last = groups[groups.length - 1]
      if (last && last.label === label) last.meetings.push(meeting)
      else groups.push({ label, meetings: [meeting] })
    }
    return groups
  }, [shown])

  const thisWeek = upcoming.filter(
    (m) => new Date(m.scheduledAt).getTime() < now + 7 * 86_400_000,
  ).length

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Meetings" />
      <div className="p-4 lg:px-8 lg:py-7 flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <h2 className="font-display font-bold text-[22px] text-text-1">Meetings</h2>
            <p className="font-ui text-[13px] text-text-3">
              Who is meeting which client, and when — across the department
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Select value={host} onChange={setHost} options={HOST_OPTIONS} size="sm" className="w-40" />
            <Button size="sm" iconLeft={<Plus size={15} />} onClick={() => { setEditing(null); setFormOpen(true) }}>Schedule</Button>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <Tabs
            tabs={TABS.map((t) => ({
              ...t,
              badge: t.key === 'upcoming' ? upcoming.length : past.length,
            }))}
            activeKey={tab}
            onChange={setTab}
          />

          {grouped.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-surface-2 text-text-3">
                <CalendarClock size={22} />
              </span>
              <p className="font-ui text-[14px] text-text-2">
                {tab === 'upcoming' ? 'Nothing scheduled' : 'No meetings held yet'}
              </p>
            </div>
          ) : (
            grouped.map((group) => (
              <section key={group.label} className="flex flex-col gap-2.5">
                <div className="flex items-center gap-2 px-0.5">
                  <h3 className="font-ui text-[11px] font-semibold uppercase tracking-widest text-text-4">
                    {group.label}
                  </h3>
                  {group.label === 'Today' && thisWeek > 0 && (
                    <span className="font-mono text-[11px] text-text-4">{thisWeek} this week</span>
                  )}
                </div>
                {group.meetings.map((meeting) => (
                  <MeetingRow
                    key={meeting.id}
                    meeting={meeting}
                    onClick={() => { setEditing(meeting); setFormOpen(true) }}
                  />
                ))}
              </section>
            ))
          )}
        </div>
      </div>

      {formOpen && (
        <MeetingFormModal
          key={editing?.id ?? 'new'}
          open
          meeting={editing}
          onClose={() => { setFormOpen(false); setEditing(null) }}
        />
      )}
    </div>
  )
}

function MeetingRow({ meeting, onClick }: { meeting: BdMeeting; onClick: () => void }) {
  const type = TYPE_CONFIG[meeting.type]
  const platform = PLATFORM_CONFIG[meeting.platform]
  const PlatformIcon = platform.icon

  return (
    <article
      onClick={onClick}
      className="flex cursor-pointer flex-col gap-3 rounded-lg border border-border-default bg-surface-1 p-4 transition-colors duration-150 hover:border-border-strong"
    >
      <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
        {/* Time block — the column a schedule is scanned down. */}
        <div className="w-[68px] shrink-0">
          <p className="font-display font-bold text-[17px] text-text-1 tabular-nums leading-none">
            {timeOf(meeting.scheduledAt)}
          </p>
          <p className="font-mono text-[10.5px] text-text-4 mt-1">{meeting.durationMinutes} min</p>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-ui font-semibold text-[14px] text-text-1 truncate">{meeting.company}</h4>
            <span
              className={cn(
                'rounded-full border px-2 py-0.5 font-ui text-[10px] font-semibold uppercase tracking-[0.04em]',
                type.classes,
              )}
            >
              {type.label}
            </span>
          </div>
          <p className="font-ui text-[12px] text-text-3 mt-1 truncate">{meeting.clientAttendees}</p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="flex items-center gap-1.5 font-ui text-[11.5px] text-text-3">
            <PlatformIcon size={13} className="text-text-4" />
            {platform.label}
          </span>
          <span className="flex items-center gap-1.5">
            <Avatar name={meeting.hostName} size="xs" />
            <span className="font-ui text-[12px] text-text-2 hidden sm:inline">{meeting.hostName}</span>
          </span>
        </div>
      </div>

      {meeting.internalAttendees.length > 0 && (
        <p className="font-ui text-[11.5px] text-text-4 pl-0 sm:pl-[80px]">
          Also joining: {meeting.internalAttendees.map((a) => a.name).join(', ')}
        </p>
      )}

      {meeting.outcome && (
        <div className="border-t border-border-subtle pt-3 sm:pl-[80px]">
          <p className="font-ui text-[12.5px]/relaxed text-text-2">{meeting.outcome}</p>
          {meeting.nextStep && (
            <p className="flex items-center gap-1.5 font-ui text-[12px] text-text-3 mt-2">
              <ArrowRight size={12} className="text-brand-red shrink-0" />
              {meeting.nextStep}
            </p>
          )}
        </div>
      )}

      {!meeting.outcome && meeting.nextStep && (
        <p className="flex items-center gap-1.5 font-ui text-[12px] text-text-3 sm:pl-[80px]">
          <ArrowRight size={12} className="text-brand-red shrink-0" />
          {meeting.nextStep}
        </p>
      )}
    </article>
  )
}
