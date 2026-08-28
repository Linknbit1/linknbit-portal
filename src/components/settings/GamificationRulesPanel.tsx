import { Coins, Ban, ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Avatar } from '../ui/Avatar'
import { Skeleton } from '../ui/Skeleton'
import { PersonLink } from '../shared/PersonLink'
import { useToast } from '../ui/toast-context'
import {
  useGamificationParticipants, useSetRestriction,
} from '../../hooks/useGamification'
import { useAttendanceSettings } from '../../hooks/useAttendance'
import { useStandupSettings } from '../../hooks/useStandups'
import { useAuthContext } from '../../context/AuthContext'
import { useCanGovernGamification } from '../../hooks/useRoleFlags'
import { SettingsGroup } from './SettingsPrimitives'
import { cn } from '../../lib/cn'

/**
 * The gamification knobs, gathered.
 *
 * XP values are shown here but edited where they belong — check-in XP is an
 * attendance rule, standup XP is a standup rule, and duplicating either into a
 * second form would give two screens the power to disagree. This panel links to
 * them instead, so the whole scoring picture is readable in one place without
 * being writable from two.
 *
 * Participation does live here: who is in the game at all is not a rule about
 * any one module.
 */
export function GamificationRulesPanel() {
  const toast = useToast()
  const { profile } = useAuthContext()
  const canGovern = useCanGovernGamification()
  const { data: participants = [], isLoading } = useGamificationParticipants()
  const { data: attendance } = useAttendanceSettings()
  const { data: standup } = useStandupSettings()
  const { mutate: setRestriction } = useSetRestriction()

  const excludedCount = participants.filter((p) => p.is_restricted).length

  return (
    <div className="flex flex-col gap-6">
      <SettingsGroup
        icon={Coins}
        title="What earns XP"
        description="Every automatic award in the portal, and where each one is set."
      >
        <div className="-mx-4 divide-y divide-border-subtle">
          <ScoreRow
            label="On-time check-in"
            value={attendance ? `${attendance.xp_on_time_checkin} XP` : '-'}
            note="Arriving within the grace period."
            to="/settings/attendance"
            toLabel="Attendance"
          />
          <ScoreRow
            label="On-time standup"
            value={standup ? `${standup.xp_on_time} XP` : '-'}
            note={
              standup
                ? `Submitted within ${standup.on_time_window_min} minutes of the standup opening.`
                : 'Submitted inside the on-time window.'
            }
            to="/settings/standup"
            toLabel="Standup"
          />
          <ScoreRow
            label="Quests, shoutouts and badges"
            value="Per item"
            note="Each quest carries its own XP; shoutouts are valued when they are given."
            to="/gamification/board"
            toLabel="Quest Board"
          />
        </div>
      </SettingsGroup>

      <SettingsGroup
        icon={Ban}
        title="Who takes part"
        description="Excluded people are hidden from the leaderboard and cannot claim quests or redeem rewards."
      >
        {isLoading ? (
          <Skeleton className="h-40" />
        ) : (
          <>
            <p className="font-mono text-[11px] text-text-4">
              {excludedCount === 0
                ? 'Everyone is taking part.'
                : `${excludedCount} excluded of ${participants.length}.`}
            </p>
            <div className="-mx-4 max-h-112 divide-y divide-border-subtle overflow-y-auto">
              {participants.map((e) => (
                <div key={e.profile_id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <span className="flex min-w-0 items-center gap-2">
                    <Avatar name={e.name} src={e.avatar_url ?? undefined} size="xs" personId={e.profile_id} />
                    <span className="truncate font-ui text-[12.5px] text-text-2">
                      <PersonLink personId={e.profile_id}>{e.name}</PersonLink>
                      {e.profile_id === profile?.id && ' (you)'}
                    </span>
                  </span>
                  <button
                    disabled={!canGovern}
                    onClick={() =>
                      setRestriction(
                        {
                          profileId: e.profile_id,
                          restricted: !e.is_restricted,
                          reason: e.is_restricted ? null : 'Disciplinary',
                        },
                        {
                          onSuccess: () =>
                            toast(e.is_restricted ? 'Participation restored' : 'Excluded from gamification', 'success'),
                          onError: () => toast('Could not change participation', 'error'),
                        },
                      )
                    }
                    className={cn(
                      'flex shrink-0 items-center gap-1 rounded-xs px-2 py-1 font-mono text-[10.5px] transition-colors',
                      e.is_restricted ? 'bg-error/10 text-error' : 'text-text-3 hover:text-error',
                      !canGovern && 'cursor-not-allowed opacity-50',
                    )}
                  >
                    <Ban size={11} /> {e.is_restricted ? 'Excluded' : 'Exclude'}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </SettingsGroup>
    </div>
  )
}

function ScoreRow({ label, value, note, to, toLabel }: {
  label: string
  value: string
  note: string
  to: string
  toLabel: string
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="font-ui text-[12.5px] font-medium text-text-1">{label}</p>
        <p className="font-ui text-[11.5px] text-text-4">{note}</p>
      </div>
      <span className="shrink-0 font-mono text-[13px] font-bold text-coin-gold">{value}</span>
      <Link
        to={to}
        className="flex shrink-0 items-center gap-1 font-ui text-[11.5px] text-service-dev hover:underline"
      >
        {toLabel} <ExternalLink size={10} />
      </Link>
    </div>
  )
}
