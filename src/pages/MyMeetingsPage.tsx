import { useMemo, useState } from 'react'
import { CalendarClock, Video, Phone, MapPin, Users, ArrowRight } from 'lucide-react'
import { Topbar } from '../components/layout/Topbar'
import { Avatar } from '../components/ui/Avatar'
import { Tabs } from '../components/ui/Tabs'
import { useMyMeetings } from '../hooks/useBd'
import { useAuthContext } from '../context/AuthContext'
import { cn } from '../lib/cn'
import type { BdMeeting, MeetingType, MeetingPlatform } from '../types'

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

/**
 * Meetings the signed-in person is on — hosting, or invited to.
 *
 * Lives outside the BD module on purpose. A team lead pulled into a client
 * negotiation is an attendee, not a BD user: they hold no `can_view_bd`, so
 * /bd/meetings is closed to them and an invitation they cannot see is no
 * invitation at all. This page is open to all internal staff and shows only
 * their own schedule.
 */
export default function MyMeetingsPage() {
  const { profile } = useAuthContext()
  // Its own scoped query, not the BD module's. Mounting BdProvider here would
  // fire the whole department's reads for someone who is allowed none of them,
  // and every one would come back empty.
  const { data: mine = [] } = useMyMeetings()
  const [tab, setTab] = useState('upcoming')
  // Captured once per mount — reading the clock during render is impure and
  // would let a meeting jump between tabs on an unrelated re-render.
  const [now] = useState(() => Date.now())

  const { upcoming, past } = useMemo(
    () => ({
      upcoming: mine
        .filter((m) => new Date(m.scheduledAt).getTime() >= now)
        .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)),
      past: mine
        .filter((m) => new Date(m.scheduledAt).getTime() < now)
        .sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt)),
    }),
    [mine, now],
  )

  const shown = tab === 'upcoming' ? upcoming : past

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

  return (
    <div className="flex flex-1 flex-col">
      <Topbar title="My Meetings" />
      <div className="flex flex-col gap-6 p-4 lg:px-8 lg:py-7">
        <div>
          <h2 className="font-display text-[22px] font-bold text-text-1">My Meetings</h2>
          <p className="font-ui text-[13px] text-text-3">
            Client meetings you are hosting or have been invited to
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <Tabs
            tabs={[
              { key: 'upcoming', label: 'Upcoming', badge: upcoming.length },
              { key: 'past', label: 'Past', badge: past.length },
            ]}
            activeKey={tab}
            onChange={setTab}
          />

          {grouped.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-surface-2 text-text-3">
                <CalendarClock size={22} />
              </span>
              <p className="font-ui text-[14px] text-text-2">
                {tab === 'upcoming' ? 'No meetings scheduled' : 'No past meetings'}
              </p>
              <p className="max-w-[44ch] font-ui text-[12.5px]/relaxed text-text-4">
                When somebody adds you to a client meeting, it appears here with the time, the platform and what it is for.
              </p>
            </div>
          ) : (
            grouped.map((group) => (
              <section key={group.label} className="flex flex-col gap-2.5">
                <h3 className="px-0.5 font-ui text-[11px] font-semibold uppercase tracking-widest text-text-4">
                  {group.label}
                </h3>
                {group.meetings.map((meeting) => {
                  const type = TYPE_CONFIG[meeting.type]
                  const platform = PLATFORM_CONFIG[meeting.platform]
                  const PlatformIcon = platform.icon
                  const hosting = meeting.hostId === profile?.id
                  return (
                    <article
                      key={meeting.id}
                      className="flex flex-col gap-3 rounded-lg border border-border-default bg-surface-1 p-4"
                    >
                      <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
                        <div className="w-[68px] shrink-0">
                          <p className="font-display text-[17px] font-bold leading-none tabular-nums text-text-1">
                            {new Date(meeting.scheduledAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          <p className="mt-1 font-mono text-[10.5px] text-text-4">{meeting.durationMinutes} min</p>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="truncate font-ui text-[14px] font-semibold text-text-1">{meeting.company}</h4>
                            <span className={cn('rounded-sm border px-2 py-0.5 font-ui text-[10px] font-semibold uppercase tracking-[0.04em]', type.classes)}>
                              {type.label}
                            </span>
                            {!hosting && (
                              <span className="rounded-sm border border-border-subtle bg-surface-2 px-2 py-0.5 font-ui text-[10px] uppercase tracking-wider text-text-4">
                                Invited
                              </span>
                            )}
                          </div>
                          <p className="mt-1 truncate font-ui text-[12px] text-text-3">{meeting.clientAttendees}</p>
                        </div>

                        <div className="flex shrink-0 items-center gap-3">
                          {/* The link is the point of the card on the morning of
                              the call, so it outranks the platform label rather
                              than sitting beside it. */}
                          {meeting.joinUrl ? (
                            <a
                              href={meeting.joinUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 rounded-sm border border-brand-red/30 bg-brand-red/10 px-2.5 py-1 font-ui text-[11.5px] font-medium text-brand-red transition-colors hover:bg-brand-red/15"
                            >
                              <PlatformIcon size={13} /> Join
                            </a>
                          ) : (
                            <span className="flex items-center gap-1.5 font-ui text-[11.5px] text-text-3">
                              <PlatformIcon size={13} className="text-text-4" /> {platform.label}
                            </span>
                          )}
                          <span className="flex items-center gap-1.5">
                            <Avatar name={meeting.hostName} size="xs" />
                            <span className="hidden font-ui text-[12px] text-text-2 sm:inline">{meeting.hostName}</span>
                          </span>
                        </div>
                      </div>

                      {meeting.internalAttendees.length > 0 && (
                        <p className="flex items-center gap-1.5 font-ui text-[11.5px] text-text-4 sm:pl-[80px]">
                          <Users size={11} className="shrink-0" />
                          {meeting.internalAttendees.map((a) => a.name).join(', ')}
                        </p>
                      )}

                      {meeting.nextStep && (
                        <p className="flex items-center gap-1.5 font-ui text-[12px] text-text-3 sm:pl-[80px]">
                          <ArrowRight size={12} className="shrink-0 text-brand-red" /> {meeting.nextStep}
                        </p>
                      )}
                    </article>
                  )
                })}
              </section>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
