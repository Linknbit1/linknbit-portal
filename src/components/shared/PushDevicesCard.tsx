import { Bell, BellOff, Smartphone, Info } from 'lucide-react'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Toggle } from '../ui/Toggle'
import { useToast } from '../ui/toast-context'
import { useAuthContext } from '../../context/AuthContext'
import {
  usePushSubscriptions,
  useCurrentPushEndpoint,
  useEnablePushHere,
  useDisablePushDevice,
  useTogglePushDevice,
} from '../../hooks/useNotifications'
import { pushSupported, isIosBrowserWithoutPwa, permissionState } from '../../lib/push'
import { cn } from '../../lib/cn'

/**
 * Per-device push control.
 *
 * A push subscription belongs to a browser install, so it can only be CREATED on
 * the device it is for — hence "Enable" exists only for this device. Disabling is
 * different: you can silence any device from here (lost phone, office desktop
 * buzzing overnight), which just flips the row server-side.
 */
export function PushDevicesCard() {
  const toast = useToast()
  const { profile } = useAuthContext()
  const profileId = profile?.id ?? ''

  const { data: devices = [], isLoading } = usePushSubscriptions(profileId)
  const { data: currentEndpoint } = useCurrentPushEndpoint()
  const enableHere = useEnablePushHere(profileId)
  const disableDevice = useDisablePushDevice(profileId)
  const toggleDevice = useTogglePushDevice(profileId)

  const supported = pushSupported()
  const iosNeedsPwa = isIosBrowserWithoutPwa()
  const permission = permissionState()
  const thisDeviceOn = !!currentEndpoint && devices.some((d) => d.endpoint === currentEndpoint)

  const handleEnable = () => enableHere.mutate(undefined, {
    onSuccess: () => toast('Notifications enabled on this device', 'success'),
    onError: (e) => toast(
      e.message === 'permission_denied'
        ? 'Your browser blocked notifications — allow them in site settings, then try again'
        : e.message === 'push_not_configured'
          ? 'Push isn’t configured on the server yet'
          : 'Could not enable notifications on this device',
      'error',
    ),
  })

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Bell size={15} className="text-text-3" />
          <h3 className="font-display font-bold text-[15px] text-text-1">Push Notifications</h3>
        </div>
        {supported && !iosNeedsPwa && !thisDeviceOn && (
          <Button size="sm" onClick={handleEnable} disabled={enableHere.isPending}>
            <Bell size={13} /> {enableHere.isPending ? 'Enabling…' : 'Enable on this device'}
          </Button>
        )}
      </div>

      <p className="font-ui text-[12px] text-text-3">
        Each device is separate — turn it on once per phone or computer you use.
        While the portal is open and focused you'll see an in-app alert instead of a system pop-up.
      </p>

      {/* Platform caveats worth saying out loud rather than showing a dead button */}
      {!supported && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-md bg-surface-2 border border-border-default">
          <Info size={13} className="text-text-4 shrink-0 mt-0.5" />
          <p className="font-ui text-[11.5px] text-text-3">This browser doesn’t support push notifications.</p>
        </div>
      )}
      {iosNeedsPwa && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-md bg-service-mkt/8 border border-service-mkt/20">
          <Info size={13} className="text-service-mkt shrink-0 mt-0.5" />
          <p className="font-ui text-[11.5px] text-text-2">
            On iPhone/iPad, add the portal to your Home Screen first — Safari only allows
            notifications from the installed app.
          </p>
        </div>
      )}
      {supported && !iosNeedsPwa && permission === 'denied' && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-md bg-error/8 border border-error/20">
          <Info size={13} className="text-error shrink-0 mt-0.5" />
          <p className="font-ui text-[11.5px] text-text-2">
            Notifications are blocked for this site in your browser settings. Allow them there, then reload.
          </p>
        </div>
      )}

      {isLoading ? (
        <div className="h-14 bg-surface-2 rounded-md animate-pulse" />
      ) : devices.length === 0 ? (
        <p className="font-ui text-[12.5px] text-text-4 py-2">
          No devices are receiving push notifications yet.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {devices.map((d) => {
            const isCurrent = d.endpoint === currentEndpoint
            return (
              <div
                key={d.id}
                className={cn(
                  'flex items-center gap-3 rounded-md border px-3 py-2.5',
                  isCurrent ? 'border-brand-red/30 bg-brand-red/4' : 'border-border-subtle',
                )}
              >
                <Smartphone size={14} className="text-text-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-ui font-medium text-[13px] text-text-1 truncate">
                    {d.device_label ?? 'Unknown device'}
                    {isCurrent && (
                      <span className="ml-2 font-mono text-[10px] text-brand-red uppercase tracking-wide">This device</span>
                    )}
                  </p>
                  <p className="font-mono text-[10.5px] text-text-4">
                    {d.enabled ? 'Receiving notifications' : 'Muted'}
                  </p>
                </div>
                {/* Muting works for any device; only this one can be unsubscribed here. */}
                <Toggle
                  checked={d.enabled}
                  onChange={(v) => toggleDevice.mutate(
                    { id: d.id, enabled: v },
                    { onError: () => toast('Could not update this device', 'error') },
                  )}
                />
                <button
                  title={isCurrent ? 'Turn off and unsubscribe this device' : 'Remove this device'}
                  onClick={() => disableDevice.mutate(
                    { id: d.id, isCurrentDevice: isCurrent },
                    {
                      onSuccess: () => toast('Device removed from notifications', 'success'),
                      onError: () => toast('Could not remove this device', 'error'),
                    },
                  )}
                  className="p-1.5 text-text-4 hover:text-error transition-colors shrink-0"
                >
                  <BellOff size={13} />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
