import { BellRing } from 'lucide-react'
import { Card } from '../ui/Card'
import { Toggle } from '../ui/Toggle'
import { useToast } from '../ui/toast-context'
import { useAuthContext } from '../../context/AuthContext'
import { useNotificationPreferences, useSetNotificationPreference } from '../../hooks/useNotifications'
import { notificationGroupsFor } from '../../constants/notifications'

/**
 * Per-type notification preferences.
 *
 * Only types this role can actually receive are listed (an employee never sees
 * "Device approvals"), and turning one off stops it everywhere at once — the DB
 * gate drops it before it becomes a bell row, a realtime event, or a push.
 */
export function NotificationPreferencesCard() {
  const toast = useToast()
  const { profile } = useAuthContext()
  const profileId = profile?.id ?? ''

  const { isEnabled, isLoading } = useNotificationPreferences(profileId)
  const setPref = useSetNotificationPreference(profileId)
  const groups = notificationGroupsFor(profile?.role)

  return (
    <Card className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <BellRing size={15} className="text-text-3" />
        <h3 className="font-display font-bold text-[15px] text-text-1">What you get notified about</h3>
      </div>

      {isLoading ? (
        <div className="h-24 bg-surface-2 rounded-md animate-pulse" />
      ) : (
        groups.map((group) => (
          <div key={group.key} className="flex flex-col gap-2">
            <p className="font-mono text-[10.5px] uppercase tracking-wider text-text-4">{group.label}</p>
            <div className="flex flex-col divide-y divide-border-subtle">
              {group.items.map((item) => (
                <label key={item.type} className="flex items-start gap-3 py-2.5 cursor-pointer">
                  <div className="min-w-0 flex-1">
                    <p className="font-ui font-medium text-[13px] text-text-1">{item.label}</p>
                    <p className="font-ui text-[11.5px] text-text-4">{item.description}</p>
                  </div>
                  <Toggle
                    checked={isEnabled(item.type)}
                    onChange={(v) => setPref.mutate(
                      { type: item.type, enabled: v },
                      { onError: () => toast('Could not save that preference', 'error') },
                    )}
                  />
                </label>
              ))}
            </div>
          </div>
        ))
      )}
    </Card>
  )
}
