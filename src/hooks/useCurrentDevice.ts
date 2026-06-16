import { useEffect, useState } from 'react'
import { getDeviceFingerprint, getDeviceName } from '../lib/deviceUtils'
import { useMyEnrolledDevices } from './useEnrolledDevices'
import { useAuthContext } from '../context/AuthContext'

// 'privileged' = admin/super_admin (auto-approved on check-in, never gated).
export type CurrentDeviceStatus = 'privileged' | 'approved' | 'pending' | 'blocked' | 'unregistered'

// Resolves the fingerprint of the device the user is on, then reports whether it is
// cleared to check in. Centralises the fingerprint computation + device lookup + role
// check so the check-in card, the dashboard quick-action, and the My Devices list all
// agree on a single source of truth.
export function useCurrentDevice() {
  const { profile } = useAuthContext()
  const [fingerprint, setFingerprint] = useState('')
  const [deviceName, setDeviceName] = useState('')
  const [deviceReady, setDeviceReady] = useState(false)
  const { data: devices = [], isLoading: devicesLoading } = useMyEnrolledDevices()

  useEffect(() => {
    Promise.all([getDeviceFingerprint(), Promise.resolve(getDeviceName())]).then(([fp, name]) => {
      setFingerprint(fp)
      setDeviceName(name)
      setDeviceReady(true)
    })
  }, [])

  const privileged = profile?.role === 'admin' || profile?.role === 'super_admin'
  // Ready = we know both the fingerprint and the user's registered devices, so a status
  // decision won't flash the wrong state. Privileged users never need the device list.
  const ready = privileged || (deviceReady && !devicesLoading)

  const current = deviceReady ? devices.find((d) => d.device_fingerprint === fingerprint) ?? null : null

  let status: CurrentDeviceStatus
  if (privileged) status = 'privileged'
  else if (!current) status = 'unregistered'
  else if (!current.is_active) status = 'blocked'
  else if (current.approved_by) status = 'approved'
  else status = 'pending'

  // Only admins and already-approved devices may check in directly.
  const canCheckIn = privileged || status === 'approved'

  return { fingerprint, deviceName, deviceReady, ready, status, canCheckIn, privileged, devices }
}
