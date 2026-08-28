import { Smartphone, Check, Clock, ShieldX, Fingerprint } from 'lucide-react'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { useCurrentDevice } from '../../hooks/useCurrentDevice'
import { useRegisterDevice } from '../../hooks/useEnrolledDevices'
import { useAuthContext } from '../../context/AuthContext'
import { MGMT_ROLES } from '../../constants/roles'
import { useToast } from '../ui/toast-context'
import { cn } from '../../lib/cn'
import type { EnrolledDevice } from '../../api/attendance'

function statusMeta(d: EnrolledDevice) {
  if (!d.is_active) return { label: 'Blocked', icon: ShieldX, cls: 'bg-error/10 text-error border-error/30' }
  if (d.approved_by) return { label: 'Approved', icon: Check, cls: 'bg-success/10 text-success border-success/30' }
  return { label: 'Pending', icon: Clock, cls: 'bg-warning/10 text-warning border-warning/30' }
}

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'

export function MyDevicesCard() {
  const toast = useToast()
  const { profile } = useAuthContext()
  const { fingerprint, fingerprintHint, deviceName, ready, status, devices, privileged } = useCurrentDevice()
  const registerMut = useRegisterDevice()
  // The raw fingerprint hash is only meaningful to HR/admin (device governance);
  // employees and team leads see device name + status only.
  const canSeeFingerprint = MGMT_ROLES.includes(profile?.role ?? '')

  const handleRegister = async () => {
    try {
      const res = await registerMut.mutateAsync({ deviceFingerprint: fingerprint, deviceName, fingerprintHint })
      toast(
        res.status === 'approved'
          ? 'Device registered and approved.'
          : 'Device registered. An admin will review it shortly.',
        'success',
      )
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Registration failed', 'error')
    }
  }

  const showRegister = ready && !privileged && status === 'unregistered'

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Smartphone size={15} className="text-text-3" />
          <h3 className="font-display font-bold text-[15px] text-text-1">My Devices</h3>
        </div>
        {showRegister && (
          <Button size="sm" onClick={handleRegister} disabled={registerMut.isPending}>
            <Fingerprint size={13} />
            {registerMut.isPending ? 'Registering…' : 'Register this device'}
          </Button>
        )}
      </div>

      <p className="font-ui text-[12px] text-text-3 -mt-1.5">
        Check-in is only allowed from devices an admin has approved. You can register more than one device.
      </p>

      {devices.length === 0 ? (
        <div className="py-6 text-center font-mono text-[12px] text-text-4">
          {ready ? 'No devices registered yet.' : 'Detecting device…'}
        </div>
      ) : (
        <div className="divide-y divide-border-subtle">
          {devices.map((d) => {
            const meta = statusMeta(d)
            const isCurrent = ready && d.device_fingerprint === fingerprint
            return (
              <div key={d.id} className="flex items-center gap-3 py-2.5">
                <Smartphone size={14} className="text-text-4 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-ui text-[13px] text-text-1 truncate">{d.device_name}</span>
                    {isCurrent && (
                      <span className="px-1.5 py-0.5 rounded-xs bg-service-dev/10 border border-service-dev/30 text-service-dev text-[10px] font-mono font-semibold uppercase tracking-wide">
                        This device
                      </span>
                    )}
                  </div>
                  <p className="font-mono text-[10px] text-text-4 mt-0.5">
                    {canSeeFingerprint && `${d.device_fingerprint.slice(0, 16)}… · `}added {fmtDate(d.first_seen_at)}
                  </p>
                </div>
                <span className={cn('inline-flex items-center gap-1 px-2 py-1 rounded-xs text-[11px] font-ui font-semibold border', meta.cls)}>
                  <meta.icon size={11} /> {meta.label}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
