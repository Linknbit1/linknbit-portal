import { useEffect, useState } from 'react'
import { getDeviceToken, getDeviceFingerprint, getDeviceName } from '../lib/deviceUtils'
import { useMyEnrolledDevices } from './useEnrolledDevices'
import { useAuthContext } from '../context/AuthContext'

// 'privileged' = admin/super_admin (auto-approved on check-in, never gated).
export type CurrentDeviceStatus = 'privileged' | 'approved' | 'pending' | 'blocked' | 'unregistered'

// navigator.brave is non-standard; present only in Brave.
interface BraveNavigator extends Navigator {
  brave?: { isBrave: () => Promise<boolean> }
}

// Resolves the identity (cookie token) of the device the user is on, then reports
// whether it is cleared to check in. Centralises identity + device lookup + role check
// so the check-in card, the My Day quick-action, and the My Devices list all agree
// on a single source of truth. `fingerprint` carries the stable token (the identity);
// `fingerprintHint` carries the specs hash, stored as a soft signal only.
export function useCurrentDevice() {
  const { profile } = useAuthContext()
  const [fingerprint, setFingerprint] = useState('')
  const [fingerprintHint, setFingerprintHint] = useState('')
  const [deviceName, setDeviceName] = useState('')
  const [deviceReady, setDeviceReady] = useState(false)
  const { data: devices = [], isLoading: devicesLoading } = useMyEnrolledDevices()

  useEffect(() => {
    const token = getDeviceToken()
    getDeviceFingerprint().then(async (hint) => {
      let name = getDeviceName()
      // Brave masquerades as Chrome in the UA; correct the display name when detectable.
      const nav = navigator as BraveNavigator
      if (nav.brave && (await nav.brave.isBrave().catch(() => false))) {
        name = name.replace(/^Chrome\b/, 'Brave')
      }
      setFingerprint(token)
      setFingerprintHint(hint)
      setDeviceName(name)
      setDeviceReady(true)
    })
  }, [])

  const privileged = profile?.role === 'admin' || profile?.role === 'super_admin'
  // Ready = we know both the identity and the user's registered devices, so a status
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

  return { fingerprint, fingerprintHint, deviceName, deviceReady, ready, status, canCheckIn, privileged, devices }
}
